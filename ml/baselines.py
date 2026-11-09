import numpy as np
import pandas as pd


def _b0_values(df: pd.DataFrame, target_kode: str) -> np.ndarray:
    if target_kode == "RATA_RATA":
        return df["last_available_avg"].to_numpy(dtype=float)
    return df[f"last_{target_kode}_k"].to_numpy(dtype=float)


def _current_values(df: pd.DataFrame, target_kode: str) -> np.ndarray:
    if target_kode == "RATA_RATA":
        return df["avg_k"].to_numpy(dtype=float)
    return df[f"nilai_{target_kode}_k"].to_numpy(dtype=float)


def b0(df: pd.DataFrame, target_kode: str = "RATA_RATA") -> np.ndarray:
    return np.clip(_b0_values(df, target_kode), 0.0, 100.0)


def b1(df: pd.DataFrame, target_kode: str = "RATA_RATA") -> np.ndarray:
    values = df["angkatan_avg_target_k"].to_numpy(dtype=float)
    fallback = _b0_values(df, target_kode)
    return np.clip(np.where(np.isnan(values), fallback, values), 0.0, 100.0)


def b2(df: pd.DataFrame, target_kode: str = "RATA_RATA") -> np.ndarray:
    base = _b0_values(df, target_kode)
    reference = _current_values(df, target_kode)
    reference = np.where(np.isnan(reference), base, reference)
    prediction = base.copy()

    low = reference < 70
    high = reference >= 80
    prediction[low] = np.maximum(0.0, base[low] - 5.0)
    prediction[high] = np.minimum(100.0, base[high] + 1.0)

    return np.clip(prediction, 0.0, 100.0)


def b0_previous(df: pd.DataFrame, target_kode: str = "RATA_RATA") -> np.ndarray:
    if "b0_strict" not in df.columns:
        raise ValueError("Kolom b0_strict tidak tersedia untuk B0 ketat.")
    return np.clip(df["b0_strict"].to_numpy(dtype=float), 0.0, 100.0)


def b1_previous(df: pd.DataFrame, target_kode: str = "RATA_RATA") -> np.ndarray:
    values = df["angkatan_avg_target_k"].to_numpy(dtype=float)
    fallback = df["b0_strict"].to_numpy(dtype=float)
    return np.clip(np.where(np.isnan(values), fallback, values), 0.0, 100.0)


def b2_previous(df: pd.DataFrame, target_kode: str = "RATA_RATA") -> np.ndarray:
    base = df["b0_strict"].to_numpy(dtype=float)
    reference = _current_values(df, target_kode)
    reference = np.where(np.isnan(reference), base, reference)
    prediction = base.copy()

    low = reference < 70
    high = reference >= 80
    prediction[low] = np.maximum(0.0, base[low] - 5.0)
    prediction[high] = np.minimum(100.0, base[high] + 1.0)

    return np.clip(prediction, 0.0, 100.0)


def all_baselines(
    df: pd.DataFrame,
    target_kode: str = "RATA_RATA",
    strict: bool = False,
):
    if strict:
        return {
            "B0": b0_previous(df, target_kode),
            "B1": b1_previous(df, target_kode),
            "B2": b2_previous(df, target_kode),
        }
    return {
        "B0": b0(df, target_kode),
        "B1": b1(df, target_kode),
        "B2": b2(df, target_kode),
    }
