from __future__ import annotations

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error


def mae(y_true, y_pred) -> float:
    return float(mean_absolute_error(y_true, y_pred))


def rmse(y_true, y_pred) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def mape(y_true, y_pred) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = y_true != 0
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def bias(y_true, y_pred) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean(y_pred - y_true))


def regression_metrics(y_true, y_pred) -> dict[str, float]:
    return {
        "mae": mae(y_true, y_pred),
        "rmse": rmse(y_true, y_pred),
        "mape": mape(y_true, y_pred),
        "bias": bias(y_true, y_pred),
    }


def _cluster_indices(groups) -> tuple[np.ndarray, dict]:
    groups = np.asarray(groups)
    unique = np.unique(groups)
    return unique, {group: np.flatnonzero(groups == group) for group in unique}


def cluster_bootstrap_ci(
    y_true,
    y_pred,
    groups,
    reps: int = 1000,
    seed: int = 42,
) -> tuple[float, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    unique, indices = _cluster_indices(groups)
    rng = np.random.default_rng(seed)
    values = np.empty(reps, dtype=float)

    for i in range(reps):
        drawn = rng.choice(unique, size=len(unique), replace=True)
        selected = np.concatenate([indices[group] for group in drawn])
        values[i] = mae(y_true[selected], y_pred[selected])

    low, high = np.percentile(values, [2.5, 97.5])
    return float(low), float(high)


def cluster_paired_delta_ci(
    y_true,
    y_pred_model,
    y_pred_baseline,
    groups,
    reps: int = 1000,
    seed: int = 42,
) -> tuple[float, float]:
    y_true = np.asarray(y_true, dtype=float)
    delta = np.abs(y_true - np.asarray(y_pred_model, dtype=float)) - np.abs(
        y_true - np.asarray(y_pred_baseline, dtype=float)
    )
    unique, indices = _cluster_indices(groups)
    rng = np.random.default_rng(seed)
    values = np.empty(reps, dtype=float)

    for i in range(reps):
        drawn = rng.choice(unique, size=len(unique), replace=True)
        selected = np.concatenate([indices[group] for group in drawn])
        values[i] = float(np.mean(delta[selected]))

    low, high = np.percentile(values, [2.5, 97.5])
    return float(low), float(high)


def grouped_metrics(df, prediction_column: str, group_columns: list[str]) -> list[dict]:
    results = []
    for keys, group in df.groupby(group_columns, dropna=False):
        if not isinstance(keys, tuple):
            keys = (keys,)
        row = dict(zip(group_columns, keys))
        row.update(regression_metrics(group["target_nilai"], group[prediction_column]))
        row["n_siswa"] = int(group["siswa_id"].nunique())
        row["n_pasangan"] = int(len(group))
        results.append(row)
    return results
