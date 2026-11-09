from __future__ import annotations

import json

import joblib
import numpy as np
import pandas as pd

from .config import ARTIFACT_DIR, MAPEL_UMUM
from .data import build_panel
from .features import build_supervised, latest_prediction_rows

TARGETS = ("RATA_RATA",) + MAPEL_UMUM


def main() -> None:
    metrics = json.loads((ARTIFACT_DIR / "metrics.json").read_text(encoding="utf-8"))
    versi = json.loads((ARTIFACT_DIR / "versi.json").read_text(encoding="utf-8"))
    published = set(versi.get("published_targets", []))
    panel = build_panel()
    mapel_id = {
        row.kode: row.mapel_id for row in panel["mapel"].itertuples(index=False)
    }

    rows = []
    for target_kode in TARGETS:
        path = ARTIFACT_DIR / f"model_{target_kode}.joblib"
        if not path.exists():
            continue
        artifact = joblib.load(path)
        dataset = build_supervised(
            panel, target_kode=target_kode, require_target=False
        )
        latest = latest_prediction_rows(dataset)
        if latest.empty:
            continue

        prediction = artifact["pipeline"].predict(latest[artifact["features"]])
        prediction = np.clip(prediction, 0.0, 100.0)
        half_width = 1.96 * float(artifact["sigma"])
        target_metrics = metrics["target_utama"] if target_kode == "RATA_RATA" else metrics[
            "target_per_mapel"
        ][target_kode]
        overall = target_metrics["overall"]

        for index, (_, row) in enumerate(latest.iterrows()):
            value = float(prediction[index])
            rows.append(
                {
                    "siswa_id": row["siswa_id"],
                    "cakupan": target_kode,
                    "mata_pelajaran_id": (
                        None if target_kode == "RATA_RATA" else mapel_id[target_kode]
                    ),
                    "semester_asal": int(row["semester_asal"]),
                    "semester_target": int(row["semester_target"]),
                    "nilai_prediksi": round(value, 2),
                    "interval_bawah": round(max(0.0, value - half_width), 2),
                    "interval_atas": round(min(100.0, value + half_width), 2),
                    "sigma": round(float(artifact["sigma"]), 4),
                    "mae_model": round(overall["metrics"]["y_pred"]["mae"], 4),
                    "mae_b0": round(overall["metrics"]["B0"]["mae"], 4),
                    "n_siswa": overall["n_siswa"],
                    "n_pasangan": overall["n_pasangan"],
                    "boleh_terbit": int(target_kode in published),
                    "model_versi": versi["versi"],
                }
            )

    output = pd.DataFrame(rows)
    output.to_csv(ARTIFACT_DIR / "prediksi_terbaru.csv", index=False)
    print(
        f"Prediksi terbaru: {len(output)} baris; "
        f"boleh diterbitkan: {int(output['boleh_terbit'].sum()) if len(output) else 0}"
    )


if __name__ == "__main__":
    main()
