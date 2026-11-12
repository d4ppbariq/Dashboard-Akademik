from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from .baselines import b0_previous, b2_previous
from .config import (
    ARTIFACT_DIR,
    BOOTSTRAP_REPS,
    MAPEL_UMUM,
    PUBLICATION_SEMESTER_ASAL,
    PUBLICATION_TAHUN_LULUS,
    RANDOM_STATE,
    RAW_DIR,
)
from .data import build_panel
from .features import build_supervised
from .metrics import cluster_paired_delta_ci, regression_metrics

TARGETS = ("RATA_RATA",) + MAPEL_UMUM
Z_95 = 1.96


def _data_hash() -> str:
    digest = hashlib.sha256()
    for name in sorted(RAW_DIR.glob("*.csv")):
        digest.update(name.name.encode("utf-8"))
        digest.update(name.read_bytes())
    return digest.hexdigest()


def _filter_primary(df: pd.DataFrame, target_kode: str) -> pd.DataFrame:
    mask = (
        (df["semester_asal"] >= 2)
        & (df["has_prev"] == 1)
        & df["b0_strict"].notna()
    )
    if target_kode == "RATA_RATA":
        mask &= df["target_count"] == 9
    else:
        mask &= df["target_count"] == 1
    return df[mask].copy()


def _passes_gate(
    mae_b2: float, mae_b0: float, delta_ci: tuple[float, float], fold_deltas
) -> bool:
    return bool(
        mae_b2 < mae_b0
        and delta_ci[1] < 0
        and all(value < 0 for value in fold_deltas)
    )


def _backtest_publication_rows(
    df: pd.DataFrame, target_kode: str
) -> pd.DataFrame:
    primary = _filter_primary(df, target_kode)
    mask = (
        (primary["tahun_lulus"] == PUBLICATION_TAHUN_LULUS)
        & (primary["semester_asal"] == PUBLICATION_SEMESTER_ASAL)
    )
    return primary[mask].copy()


def evaluate_target(
    df: pd.DataFrame, target_kode: str, reps: int = BOOTSTRAP_REPS
) -> dict:
    data = _filter_primary(df, target_kode)
    if data.empty:
        raise RuntimeError(f"Populasi primary kosong untuk target {target_kode}.")

    y_true = data["target_nilai"].to_numpy(dtype=float)
    b0 = b0_previous(data, target_kode)
    b2 = b2_previous(data, target_kode)
    groups = data["siswa_id"].to_numpy()
    metrics_b2 = regression_metrics(y_true, b2)
    metrics_b0 = regression_metrics(y_true, b0)
    delta_ci = cluster_paired_delta_ci(
        y_true, b2, b0, groups, reps=reps, seed=RANDOM_STATE
    )

    folds = []
    for year in sorted(data["tahun_lulus"].unique()):
        test = data[data["tahun_lulus"] == year]
        if test.empty:
            continue
        fold_y = test["target_nilai"].to_numpy(dtype=float)
        mae_b2 = regression_metrics(fold_y, b2_previous(test, target_kode))["mae"]
        mae_b0 = regression_metrics(fold_y, b0_previous(test, target_kode))["mae"]
        folds.append(
            {
                "test_tahun": int(year),
                "n_siswa": int(test["siswa_id"].nunique()),
                "n_pasangan": int(len(test)),
                "mae_b2": float(mae_b2),
                "mae_b0": float(mae_b0),
                "delta": float(mae_b2 - mae_b0),
            }
        )

    fold_deltas = [fold["delta"] for fold in folds]
    passed = _passes_gate(
        float(metrics_b2["mae"]),
        float(metrics_b0["mae"]),
        (float(delta_ci[0]), float(delta_ci[1])),
        fold_deltas,
    )
    return {
        "target_kode": target_kode,
        "jenis": "rule-engine",
        "mae_b2": float(metrics_b2["mae"]),
        "mae_b0": float(metrics_b0["mae"]),
        "rmse_b2": float(metrics_b2["rmse"]),
        "mape_b2": float(metrics_b2["mape"]),
        "bias_b2": float(metrics_b2["bias"]),
        "delta": float(metrics_b2["mae"] - metrics_b0["mae"]),
        "delta_ci95": [float(delta_ci[0]), float(delta_ci[1])],
        "fold_deltas": fold_deltas,
        "folds": folds,
        "n_siswa": int(data["siswa_id"].nunique()),
        "n_pasangan": int(len(data)),
        "sigma": float(np.sqrt(np.mean((y_true - b2) ** 2))),
        "passed": passed,
    }


def build_predictions(
    panel: dict[str, pd.DataFrame],
    results: dict[str, dict],
    published: list[str],
    versi: str,
) -> pd.DataFrame:
    mapel_id = {
        row.kode: row.mapel_id for row in panel["mapel"].itertuples(index=False)
    }
    rows = []
    for target_kode in published:
        dataset = build_supervised(
            panel, target_kode=target_kode, require_target=False
        )
        latest = _backtest_publication_rows(dataset, target_kode)
        if latest.empty:
            continue
        values = b2_previous(latest, target_kode)
        half_width = Z_95 * results[target_kode]["sigma"]

        for index, (_, row) in enumerate(latest.iterrows()):
            value = float(values[index])
            lower = min(max(0.0, value - half_width), value)
            upper = max(min(100.0, value + half_width), value)
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
                    "interval_bawah": round(lower, 2),
                    "interval_atas": round(upper, 2),
                    "sigma": round(float(results[target_kode]["sigma"]), 4),
                    "mae_model": round(float(results[target_kode]["mae_b2"]), 4),
                    "mae_b0": round(float(results[target_kode]["mae_b0"]), 4),
                    "n_siswa": int(results[target_kode]["n_siswa"]),
                    "n_pasangan": int(results[target_kode]["n_pasangan"]),
                    "boleh_terbit": 1,
                    "model_versi": versi,
                    "jenis": "rule-engine",
                }
            )
    return pd.DataFrame(rows)


def _write_json(path, value) -> None:
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    panel = build_panel()
    data_hash = _data_hash()
    versi = f"b2-rule-{data_hash[:10]}"

    results: dict[str, dict] = {}
    for target_kode in TARGETS:
        dataset = build_supervised(panel, target_kode=target_kode)
        try:
            results[target_kode] = evaluate_target(dataset, target_kode)
        except RuntimeError:
            continue

    mean = results.get("RATA_RATA")
    mean_passed = bool(mean and mean["passed"])
    published = (
        [target for target in TARGETS if target in results and results[target]["passed"]]
        if mean_passed
        else []
    )

    dibuat_pada = datetime.now(timezone.utc).isoformat()
    summary = {
        "versi": versi,
        "dibuat_pada": dibuat_pada,
        "protokol": "Protokol_Evaluasi_A1 Revisi 4",
        "jenis": "rule-engine",
        "mode_publikasi": "backtest",
        "tahun_lulus": PUBLICATION_TAHUN_LULUS,
        "semester_asal": PUBLICATION_SEMESTER_ASAL,
        "data_hash": data_hash,
        "targets": results,
        "gate": {
            "mean_passed": mean_passed,
            "published_targets": published,
        },
    }

    if not mean_passed:
        _write_json(ARTIFACT_DIR / "b2_metrics.json", summary)
        print(
            "B2 tidak lulus gate terhadap B0. Tabel Prediksi tidak diubah."
        )
        return

    frame = build_predictions(panel, results, published, versi)
    frame.to_csv(ARTIFACT_DIR / "prediksi_terbaru.csv", index=False)
    summary["n_baris"] = int(len(frame))
    _write_json(ARTIFACT_DIR / "b2_metrics.json", summary)
    _write_json(
        ARTIFACT_DIR / "b2_versi.json",
        {
            "versi": versi,
            "dibuat_pada": dibuat_pada,
            "data_hash": data_hash,
            "jenis": "rule-engine",
            "mode_publikasi": "backtest",
            "tahun_lulus": PUBLICATION_TAHUN_LULUS,
            "semester_asal": PUBLICATION_SEMESTER_ASAL,
            "published_targets": published,
        },
    )

    print(f"Versi: {versi} | jenis: rule-engine")
    print(f"Target terbit: {published}")
    print(f"Baris prediksi: {len(frame)}")
    print(f"Artefak: {ARTIFACT_DIR / 'b2_metrics.json'}")


if __name__ == "__main__":
    main()
