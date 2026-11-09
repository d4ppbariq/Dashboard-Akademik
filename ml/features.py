from __future__ import annotations

import numpy as np
import pandas as pd

from .config import MAPEL_UMUM, SEMESTER

CORE_FEATURES = (
    "avg_prev",
    "avg_k",
    "delta_prev",
    "last_available_avg",
    "min_k",
    "max_k",
    "std_k",
    "n_mapel_k",
    "trend_slope",
    "avg_cum",
    "z_angkatan_k",
    "z_kelas_k",
    "angkatan_avg_k",
    "kelas_avg_k",
    "semester_asal",
    "rasio_hadir",
    "cum_alpa",
    "n_semester_kehadiran",
    "jenis_kelamin_L",
)

V2_EXTRA_FEATURES = (
    "hinge_70",
    "hinge_80",
    "ix_semester_trend",
    "ix_sejak_avg",
)

V2_FEATURES = CORE_FEATURES + V2_EXTRA_FEATURES

V3_EXTRA_FEATURES = ("b2_delta",)

V3_FEATURES = CORE_FEATURES + V3_EXTRA_FEATURES

EXCLUDED_FEATURES = {
    "siswa_id",
    "nis",
    "nama",
    "kelas_id",
    "nama_kelas",
    "angkatan_id",
    "tahun_lulus",
    "jenis_kelamin",
    "target_nilai",
    "target_count",
    "target_kode",
    "semester_target",
    "is_latest_observed",
    "has_prev",
    "cold_start",
    "first_sem",
    "late_entry",
    "n_missing_early",
    "semester_sejak_masuk",
    "n_observed_before",
    "b0_strict",
    "hinge_70",
    "hinge_80",
    "ix_semester_trend",
    "ix_sejak_avg",
    "b2_delta",
}


def _mean(values) -> float:
    arr = np.asarray(values, dtype=float)
    if arr.size == 0 or np.all(np.isnan(arr)):
        return np.nan
    return float(np.nanmean(arr))


def _std(values) -> float:
    arr = np.asarray(values, dtype=float)
    if arr.size == 0 or np.all(np.isnan(arr)):
        return np.nan
    return float(np.nanstd(arr, ddof=0))


def _slope(values: pd.Series) -> float:
    valid = values.dropna()
    if len(valid) < 2:
        return np.nan
    x = valid.index.to_numpy(dtype=float)
    return float(np.polyfit(x, valid.to_numpy(dtype=float), 1)[0])


def _build_aggregates(panel: dict[str, pd.DataFrame]):
    siswa = panel["siswa"][["siswa_id", "kelas_id", "angkatan_id"]]
    nilai = panel["nilai_umum"].merge(siswa, on="siswa_id", how="left")

    student_avg = (
        nilai.groupby(["siswa_id", "semester"], as_index=False)["nilai"]
        .mean()
        .merge(siswa, on="siswa_id", how="left")
    )

    angkatan = student_avg.groupby(["angkatan_id", "semester"])["nilai"].agg(
        ["mean", "std"]
    )
    kelas = student_avg.groupby(["kelas_id", "semester"])["nilai"].agg(
        ["mean", "std"]
    )
    angkatan_mapel = nilai.groupby(["angkatan_id", "semester", "kode"])[
        "nilai"
    ].agg(["mean", "std"])
    kelas_mapel = nilai.groupby(["kelas_id", "semester", "kode"])["nilai"].agg(
        ["mean", "std"]
    )

    return {
        "angkatan": angkatan,
        "kelas": kelas,
        "angkatan_mapel": angkatan_mapel,
        "kelas_mapel": kelas_mapel,
    }


def _aggregate_value(table: pd.DataFrame, key, column: str) -> float:
    try:
        return float(table.loc[key, column])
    except KeyError:
        return np.nan


def _attendance_features(att_sub: pd.DataFrame, k: int) -> dict[str, float]:
    current = (
        att_sub.loc[k]
        if k in att_sub.index
        else pd.Series(dtype=float)
    )
    history = att_sub.loc[att_sub.index <= k].sort_index()

    def value(column: str) -> float:
        if current.empty or column not in current.index:
            return np.nan
        return float(current[column])

    def cumulative(column: str) -> float:
        if history.empty or column not in history.columns:
            return np.nan
        total = history[column].sum(min_count=1)
        return float(total)

    cum_hari = cumulative("hari_efektif")
    cum_absen = cumulative("absen_total")
    rasio_cum = (
        1.0 - (cum_absen / cum_hari)
        if pd.notna(cum_hari) and cum_hari > 0 and pd.notna(cum_absen)
        else np.nan
    )

    return {
        "sakit": value("sakit"),
        "izin": value("izin"),
        "alpa": value("tanpa_keterangan"),
        "absen_total": value("absen_total"),
        "rasio_hadir": value("rasio_hadir"),
        "melebihi_hari_efektif": value("melebihi_hari_efektif"),
        "cum_sakit": cumulative("sakit"),
        "cum_izin": cumulative("izin"),
        "cum_alpa": cumulative("tanpa_keterangan"),
        "cum_absen": cum_absen,
        "rasio_hadir_cum": np.clip(rasio_cum, 0.0, 1.0),
        "n_semester_kehadiran": float(len(history)),
    }


def _grade_features(
    sub: pd.DataFrame,
    k: int,
    meta: pd.Series,
    aggregates: dict[str, pd.DataFrame],
    target_kode: str,
) -> tuple[dict[str, float], float, int]:
    history = sub.loc[sub.index <= k].sort_index()
    current = sub.loc[k, list(MAPEL_UMUM)]
    next_row = sub.loc[k + 1] if k + 1 in sub.index else None

    avg_by_semester = history[list(MAPEL_UMUM)].mean(axis=1)
    all_values = history[list(MAPEL_UMUM)].to_numpy(dtype=float).ravel()

    avg_k = _mean(current.to_numpy(dtype=float))
    avg_prev = (
        float(avg_by_semester.loc[k - 1])
        if k - 1 in avg_by_semester.index
        else np.nan
    )
    last_available_avg = (
        float(avg_by_semester.dropna().iloc[-1])
        if avg_by_semester.notna().any()
        else np.nan
    )

    observed = history[list(MAPEL_UMUM)].notna().any(axis=1)
    first_sem = int(observed[observed].index.min())
    has_prev = int((k - 1) in observed.index and bool(observed.loc[k - 1]))

    ang_key = (meta["angkatan_id"], k)
    kelas_key = (meta["kelas_id"], k)
    ang_mean = _aggregate_value(aggregates["angkatan"], ang_key, "mean")
    ang_std = _aggregate_value(aggregates["angkatan"], ang_key, "std")
    kelas_mean = _aggregate_value(aggregates["kelas"], kelas_key, "mean")
    kelas_std = _aggregate_value(aggregates["kelas"], kelas_key, "std")

    if target_kode == "RATA_RATA":
        ang_target_mean = ang_mean
        kelas_target_mean = kelas_mean
    else:
        ang_target_mean = _aggregate_value(
            aggregates["angkatan_mapel"], (meta["angkatan_id"], k, target_kode), "mean"
        )
        kelas_target_mean = _aggregate_value(
            aggregates["kelas_mapel"], (meta["kelas_id"], k, target_kode), "mean"
        )

    features: dict[str, float] = {
        "semester_asal": float(k),
        "avg_k": avg_k,
        "min_k": float(current.min()),
        "max_k": float(current.max()),
        "std_k": _std(current.to_numpy(dtype=float)),
        "n_mapel_k": float(current.notna().sum()),
        "missing_mapel_k": float(len(MAPEL_UMUM) - current.notna().sum()),
        "avg_prev": avg_prev,
        "delta_prev": avg_k - avg_prev,
        "avg_cum": _mean(all_values),
        "std_cum": _std(all_values),
        "n_semester_nilai": float(avg_by_semester.notna().sum()),
        "trend_slope": _slope(avg_by_semester),
        "last_available_avg": last_available_avg,
        "angkatan_avg_k": ang_mean,
        "angkatan_std_k": ang_std,
        "kelas_avg_k": kelas_mean,
        "kelas_std_k": kelas_std,
        "angkatan_avg_target_k": ang_target_mean,
        "kelas_avg_target_k": kelas_target_mean,
        "z_angkatan_k": (
            (avg_k - ang_mean) / ang_std if pd.notna(ang_std) and ang_std > 0 else np.nan
        ),
        "z_kelas_k": (
            (avg_k - kelas_mean) / kelas_std
            if pd.notna(kelas_std) and kelas_std > 0
            else np.nan
        ),
        "jenis_kelamin_L": float(meta["jenis_kelamin"] == "L"),
        "jenis_kelamin_P": float(meta["jenis_kelamin"] == "P"),
        "has_prev": float(has_prev),
        "cold_start": float(1 - has_prev),
        "first_sem": float(first_sem),
        "late_entry": float(first_sem > 1),
        "n_missing_early": float(max(0, first_sem - 1)),
        "semester_sejak_masuk": float(k - first_sem + 1),
        "n_observed_before": float(observed.sum()),
    }

    if pd.notna(last_available_avg):
        features["hinge_70"] = max(0.0, 70.0 - last_available_avg)
        features["hinge_80"] = max(0.0, last_available_avg - 80.0)
    else:
        features["hinge_70"] = np.nan
        features["hinge_80"] = np.nan
    features["ix_semester_trend"] = float(k) * features["trend_slope"]
    features["ix_sejak_avg"] = features["semester_sejak_masuk"] * avg_k

    for kode in MAPEL_UMUM:
        features[f"nilai_{kode}_k"] = float(current[kode])
        available = history[kode].dropna()
        features[f"last_{kode}_k"] = (
            float(available.iloc[-1]) if not available.empty else np.nan
        )

    features["b0_strict"] = float(
        features["last_available_avg"]
        if target_kode == "RATA_RATA"
        else features[f"last_{target_kode}_k"]
    )

    base = features["b0_strict"]
    reference = (
        avg_k if target_kode == "RATA_RATA" else float(current[target_kode])
    )
    if pd.isna(reference):
        reference = base
    if pd.notna(base) and pd.notna(reference):
        b2_next = base
        if reference < 70:
            b2_next = max(0.0, base - 5.0)
        elif reference >= 80:
            b2_next = min(100.0, base + 1.0)
        features["b2_delta"] = b2_next - base
    else:
        features["b2_delta"] = np.nan

    if target_kode == "RATA_RATA":
        target = (
            _mean(next_row[list(MAPEL_UMUM)].to_numpy(dtype=float))
            if next_row is not None
            else np.nan
        )
        target_count = (
            int(next_row[list(MAPEL_UMUM)].notna().sum())
            if next_row is not None
            else 0
        )
    else:
        target = (
            float(next_row[target_kode])
            if next_row is not None and pd.notna(next_row[target_kode])
            else np.nan
        )
        target_count = 1 if pd.notna(target) else 0

    return features, target, target_count


def build_supervised(
    panel: dict[str, pd.DataFrame],
    target_kode: str = "RATA_RATA",
    require_target: bool = True,
) -> pd.DataFrame:
    if target_kode != "RATA_RATA" and target_kode not in MAPEL_UMUM:
        raise ValueError(f"target_kode tidak dikenal: {target_kode}")

    aggregates = _build_aggregates(panel)
    siswa = panel["siswa"].set_index("siswa_id")
    nilai = (
        panel["nilai_umum"]
        .groupby(["siswa_id", "semester", "kode"], as_index=False)["nilai"]
        .mean()
    )

    grid = pd.MultiIndex.from_product(
        [siswa.index, SEMESTER], names=["siswa_id", "semester"]
    ).to_frame(index=False)
    wide = grid.merge(nilai, on=["siswa_id", "semester"], how="left")
    wide = wide.pivot(
        index=["siswa_id", "semester"], columns="kode", values="nilai"
    ).reset_index()
    for kode in MAPEL_UMUM:
        if kode not in wide.columns:
            wide[kode] = np.nan

    kehadiran = panel["kehadiran"]

    rows: list[dict[str, float | int | str]] = []
    for siswa_id, group in wide.groupby("siswa_id", sort=False):
        sub = group.set_index("semester").sort_index()
        observed = sub[list(MAPEL_UMUM)].notna().any(axis=1)
        if not observed.any():
            continue
        max_observed = int(sub.index[observed].max())

        att_sub = kehadiran[kehadiran["siswa_id"] == siswa_id].set_index("semester")
        meta = siswa.loc[siswa_id]

        for k in range(1, 6):
            if k not in sub.index:
                continue
            if sub.loc[k, list(MAPEL_UMUM)].notna().sum() == 0:
                continue

            features, target, target_count = _grade_features(
                sub, k, meta, aggregates, target_kode
            )
            if require_target and pd.isna(target):
                continue

            row = {
                "siswa_id": siswa_id,
                "nis": meta["nis"],
                "nama": meta["nama"],
                "kelas_id": meta["kelas_id"],
                "nama_kelas": meta["nama_kelas"],
                "angkatan_id": meta["angkatan_id"],
                "tahun_lulus": int(meta["tahun_lulus"]),
                "jenis_kelamin": meta["jenis_kelamin"],
                "semester_target": k + 1,
                "target_kode": target_kode,
                "target_nilai": target,
                "target_count": target_count,
                "is_latest_observed": k == max_observed,
            }
            row.update(features)
            row.update(_attendance_features(att_sub, k))
            rows.append(row)

    return pd.DataFrame(rows)


def feature_columns(df: pd.DataFrame) -> list[str]:
    return [
        column
        for column in df.columns
        if column not in EXCLUDED_FEATURES
        and pd.api.types.is_numeric_dtype(df[column])
    ]


def core_feature_columns(df: pd.DataFrame) -> list[str]:
    missing = [column for column in CORE_FEATURES if column not in df.columns]
    if missing:
        raise ValueError(f"Fitur inti tidak ditemukan: {missing}")
    return list(CORE_FEATURES)


def v2_feature_columns(df: pd.DataFrame) -> list[str]:
    missing = [column for column in V2_FEATURES if column not in df.columns]
    if missing:
        raise ValueError(f"Fitur V2 tidak ditemukan: {missing}")
    return list(V2_FEATURES)


def v3_feature_columns(df: pd.DataFrame) -> list[str]:
    missing = [column for column in V3_FEATURES if column not in df.columns]
    if missing:
        raise ValueError(f"Fitur V3 tidak ditemukan: {missing}")
    return list(V3_FEATURES)


def latest_prediction_rows(df: pd.DataFrame) -> pd.DataFrame:
    return df[
        (df["is_latest_observed"]) & (df["semester_asal"] < 6)
    ].copy()
