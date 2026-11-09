from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import ElasticNet, Ridge
from sklearn.model_selection import GridSearchCV, GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .baselines import all_baselines
from .config import ARTIFACT_DIR, BOOTSTRAP_REPS, MAPEL_UMUM, RANDOM_STATE, RAW_DIR
from .data import build_panel
from .features import (
    build_supervised,
    core_feature_columns,
    feature_columns,
    v2_feature_columns,
    v3_feature_columns,
)
from .metrics import (
    cluster_bootstrap_ci,
    cluster_paired_delta_ci,
    grouped_metrics,
    regression_metrics,
)

TARGETS = ("RATA_RATA",) + MAPEL_UMUM


def _pipeline(model) -> Pipeline:
    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
            ("scaler", StandardScaler()),
            ("model", model),
        ]
    )


def _candidates():
    return {
        "ridge": (
            _pipeline(Ridge(random_state=RANDOM_STATE)),
            {"model__alpha": [1.0, 10.0, 100.0]},
        ),
        "elasticnet": (
            _pipeline(ElasticNet(random_state=RANDOM_STATE, max_iter=20000)),
            {
                "model__alpha": [0.01, 0.1],
                "model__l1_ratio": [0.2, 0.5, 0.8],
            },
        ),
    }


def _fit_best(
    train_df: pd.DataFrame,
    features: list[str],
    target_values: np.ndarray | None = None,
):
    X = train_df[features]
    y = (
        target_values
        if target_values is not None
        else train_df["target_nilai"].to_numpy(dtype=float)
    )
    groups = train_df["siswa_id"].to_numpy()
    n_groups = train_df["siswa_id"].nunique()
    n_splits = min(3, n_groups)
    results = []

    for name, (pipeline, grid) in _candidates().items():
        if n_splits < 2:
            pipeline.set_params(**{key: values[0] for key, values in grid.items()})
            pipeline.fit(X, y)
            results.append((float("inf"), name, pipeline, {}))
            continue

        search = GridSearchCV(
            pipeline,
            grid,
            scoring="neg_mean_absolute_error",
            cv=GroupKFold(n_splits=n_splits),
            n_jobs=1,
            error_score="raise",
        )
        search.fit(X, y, groups=groups)
        results.append(
            (
                float(-search.best_score_),
                name,
                search.best_estimator_,
                search.best_params_,
            )
        )

    results.sort(key=lambda item: item[0])
    best_cv_mae, best_name, best_model, best_params = results[0]
    return best_model, {
        "name": best_name,
        "cv_mae": best_cv_mae,
        "params": best_params,
        "candidates": [
            {"name": name, "cv_mae": cv_mae, "params": params}
            for cv_mae, name, _, params in results
        ],
    }


def _clean(value):
    if isinstance(value, dict):
        return {key: _clean(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_clean(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        value = float(value)
    if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
        return None
    return value


def _data_hash() -> str:
    digest = hashlib.sha256()
    for name in sorted(RAW_DIR.glob("*.csv")):
        digest.update(name.name.encode("utf-8"))
        digest.update(name.read_bytes())
    return digest.hexdigest()


def _residual_prediction(b0, residual) -> np.ndarray:
    return np.clip(
        np.asarray(b0, dtype=float) + np.asarray(residual, dtype=float),
        0.0,
        100.0,
    )


def _residual_base(df: pd.DataFrame, variant: str) -> np.ndarray:
    base = df["b0_strict"].to_numpy(dtype=float)
    if variant == "v3":
        base = base + df["b2_delta"].to_numpy(dtype=float)
    return base


def _filter_population(df: pd.DataFrame, target_kode: str, population: str) -> pd.DataFrame:
    if population == "all":
        return df.copy()
    if population != "primary":
        raise ValueError(f"Populasi tidak dikenal: {population}")
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


def _select_features(df: pd.DataFrame, feature_set: str) -> list[str]:
    if feature_set == "core":
        return core_feature_columns(df)
    if feature_set == "v2":
        return v2_feature_columns(df)
    if feature_set == "v3":
        return v3_feature_columns(df)
    if feature_set == "full":
        return feature_columns(df)
    raise ValueError(f"Set fitur tidak dikenal: {feature_set}")


def _cold_start_summary(df: pd.DataFrame, target_kode: str) -> dict:
    cold = df[df["has_prev"] == 0]
    if cold.empty:
        return {"n_siswa": 0, "n_pasangan": 0, "metrics": {}}
    baselines = all_baselines(cold, target_kode, strict=False)
    return {
        "n_siswa": int(cold["siswa_id"].nunique()),
        "n_pasangan": int(len(cold)),
        "metrics": {
            name: regression_metrics(cold["target_nilai"], values)
            for name, values in baselines.items()
        },
    }


def _evaluate_target(
    df: pd.DataFrame,
    target_kode: str,
    variant: str = "v0",
    population: str = "all",
    feature_set: str = "full",
) -> tuple[dict, pd.DataFrame]:
    data = _filter_population(df, target_kode, population)
    if data.empty:
        raise RuntimeError(
            f"Populasi {population} kosong untuk target {target_kode}."
        )

    features = _select_features(data, feature_set)
    residual = variant in {"v1", "v2", "v3"}
    strict = variant != "v0"
    folds = []
    predictions = []

    for test_year in sorted(data["tahun_lulus"].unique()):
        train = data[data["tahun_lulus"] != test_year]
        test = data[data["tahun_lulus"] == test_year]
        if train.empty or test.empty:
            continue

        if residual:
            train_base = _residual_base(train, variant)
            test_base = _residual_base(test, variant)
            train_target = (
                train["target_nilai"].to_numpy(dtype=float) - train_base
            )
            model, info = _fit_best(train, features, train_target)
            if variant == "v3":
                zero_mae = float(np.nanmean(np.abs(train_target)))
                info["zero_cv_mae"] = zero_mae
                if not np.isfinite(info["cv_mae"]) or info["cv_mae"] >= zero_mae:
                    info["used_zero_residual"] = True
                    residual_values = np.zeros(len(test), dtype=float)
                else:
                    info["used_zero_residual"] = False
                    residual_values = model.predict(test[features])
            else:
                residual_values = model.predict(test[features])
            raw_prediction = test_base + residual_values
            prediction = _residual_prediction(test_base, residual_values)
        else:
            model, info = _fit_best(train, features)
            raw_prediction = model.predict(test[features])
            prediction = raw_prediction

        baseline_predictions = all_baselines(test, target_kode, strict=strict)

        fold_predictions = test[
            [
                "siswa_id",
                "nis",
                "nama",
                "kelas_id",
                "nama_kelas",
                "angkatan_id",
                "tahun_lulus",
                "semester_asal",
                "semester_target",
                "target_nilai",
                "target_kode",
                "has_prev",
                "cold_start",
            ]
        ].copy()
        fold_predictions["fold"] = f"{int(train['tahun_lulus'].iloc[0])}->{int(test_year)}"
        fold_predictions["model"] = info["name"]
        fold_predictions["y_pred"] = prediction
        fold_predictions["clipped"] = (
            (raw_prediction < 0) | (raw_prediction > 100)
        ).astype(int)
        for name, values in baseline_predictions.items():
            fold_predictions[name] = values

        fold_metrics = {
            "fold": f"{int(train['tahun_lulus'].iloc[0])}->{int(test_year)}",
            "train_tahun": int(train["tahun_lulus"].iloc[0]),
            "test_tahun": int(test_year),
            "model": info,
            "n_siswa": int(test["siswa_id"].nunique()),
            "n_pasangan": int(len(test)),
        }
        for column in ["y_pred", "B0", "B1", "B2"]:
            fold_metrics[column] = regression_metrics(
                fold_predictions["target_nilai"], fold_predictions[column]
            )
        folds.append(fold_metrics)
        predictions.append(fold_predictions)

    if not predictions:
        raise RuntimeError(f"Tidak ada fold yang dapat dievaluasi untuk {target_kode}.")

    result_df = pd.concat(predictions, ignore_index=True)
    y_true = result_df["target_nilai"].to_numpy(dtype=float)
    groups = result_df["siswa_id"].to_numpy()
    overall = {
        "n_siswa": int(result_df["siswa_id"].nunique()),
        "n_pasangan": int(len(result_df)),
        "clipped": int(result_df["clipped"].sum()),
        "metrics": {},
    }
    for column in ["y_pred", "B0", "B1", "B2"]:
        overall["metrics"][column] = regression_metrics(
            y_true, result_df[column].to_numpy(dtype=float)
        )

    model_ci = cluster_bootstrap_ci(
        y_true,
        result_df["y_pred"].to_numpy(dtype=float),
        groups,
        reps=BOOTSTRAP_REPS,
        seed=RANDOM_STATE,
    )
    delta_ci = cluster_paired_delta_ci(
        y_true,
        result_df["y_pred"].to_numpy(dtype=float),
        result_df["B0"].to_numpy(dtype=float),
        groups,
        reps=BOOTSTRAP_REPS,
        seed=RANDOM_STATE,
    )
    delta = (
        overall["metrics"]["y_pred"]["mae"]
        - overall["metrics"]["B0"]["mae"]
    )
    delta_b2_ci = cluster_paired_delta_ci(
        y_true,
        result_df["y_pred"].to_numpy(dtype=float),
        result_df["B2"].to_numpy(dtype=float),
        groups,
        reps=BOOTSTRAP_REPS,
        seed=RANDOM_STATE,
    )
    overall["model_mae_ci95"] = [float(model_ci[0]), float(model_ci[1])]
    overall["delta_vs_b0"] = float(delta)
    overall["delta_vs_b0_ci95"] = [float(delta_ci[0]), float(delta_ci[1])]
    overall["delta_vs_b2"] = float(
        overall["metrics"]["y_pred"]["mae"] - overall["metrics"]["B2"]["mae"]
    )
    overall["delta_vs_b2_ci95"] = [float(delta_b2_ci[0]), float(delta_b2_ci[1])]
    overall["gate_passed"] = bool(delta < 0 and delta_ci[1] < 0)
    overall["gate_b2_passed"] = bool(
        overall["metrics"]["y_pred"]["mae"] < overall["metrics"]["B2"]["mae"]
    )
    fold_deltas = [
        float(fold["y_pred"]["mae"] - fold["B0"]["mae"]) for fold in folds
    ]
    fold_deltas_b2 = [
        float(fold["y_pred"]["mae"] - fold["B2"]["mae"]) for fold in folds
    ]
    overall["fold_delta_vs_b0"] = fold_deltas
    overall["fold_delta_vs_b2"] = fold_deltas_b2
    overall["fold_count"] = len(folds)
    overall["folds_won_vs_b0"] = int(sum(1 for value in fold_deltas if value < 0))
    overall["folds_won_vs_b2"] = int(
        sum(1 for value in fold_deltas_b2 if value < 0)
    )
    overall["gate_passed_stable"] = bool(
        overall["gate_passed"]
        and all(value < 0 for value in fold_deltas)
        and overall["gate_b2_passed"]
    )

    grouping = {
        "per_fold": grouped_metrics(result_df, "y_pred", ["fold"]),
        "per_k": grouped_metrics(result_df, "y_pred", ["semester_asal"]),
        "per_kelas": grouped_metrics(
            result_df, "y_pred", ["tahun_lulus", "nama_kelas"]
        ),
        "per_angkatan": grouped_metrics(result_df, "y_pred", ["tahun_lulus"]),
        "per_cold_start": grouped_metrics(result_df, "y_pred", ["cold_start"]),
    }

    return {
        "target_kode": target_kode,
        "variant": variant,
        "population": population,
        "feature_set": feature_set,
        "n_features": len(features),
        "features": features,
        "folds": folds,
        "overall": overall,
        "cold_start_summary": _cold_start_summary(df, target_kode),
        **grouping,
    }, result_df


def _fit_final(df: pd.DataFrame, target_kode: str, sigma: float) -> tuple[dict, dict]:
    features = feature_columns(df)
    model, info = _fit_best(df, features)
    artifact = {
        "pipeline": model,
        "features": features,
        "target_kode": target_kode,
        "sigma": sigma,
        "info": info,
    }
    path = ARTIFACT_DIR / f"model_{target_kode}.joblib"
    joblib.dump(artifact, path)
    return info, {"sigma": sigma, "path": str(path)}


def _write_json(path: Path, value) -> None:
    path.write_text(
        json.dumps(_clean(value), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Latih dan evaluasi model prediksi nilai A1."
    )
    parser.add_argument(
        "--variant", choices=["v0", "v1", "v2", "v3"], default="v0"
    )
    parser.add_argument("--population", choices=["all", "primary"], default="all")
    parser.add_argument(
        "--feature-set", choices=["full", "core", "v2", "v3"], default="full"
    )
    parser.add_argument(
        "--targets",
        default=None,
        help="Daftar target dipisah koma, mis. RATA_RATA,MTK",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    experiment = (
        args.variant != "v0"
        or args.population != "all"
        or args.feature_set != "full"
    )
    targets = (
        tuple(item.strip() for item in args.targets.split(",") if item.strip())
        if args.targets
        else TARGETS
    )

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    panel = build_panel()
    data_hash = _data_hash()
    version = f"a1-logo2-{data_hash[:10]}"
    if experiment:
        version = f"{version}-{args.variant}-{args.feature_set}"

    target_results = {}
    all_predictions = []
    final_info = {}

    for target_kode in targets:
        dataset = build_supervised(panel, target_kode=target_kode)
        if len(dataset) < 20:
            continue
        try:
            metrics, predictions = _evaluate_target(
                dataset,
                target_kode,
                variant=args.variant,
                population=args.population,
                feature_set=args.feature_set,
            )
        except RuntimeError as error:
            if target_kode == "RATA_RATA":
                raise
            print(f"Lewati {target_kode}: {error}")
            continue
        target_results[target_kode] = metrics
        all_predictions.append(predictions)

        if not experiment:
            info, final = _fit_final(
                dataset,
                target_kode,
                target_results[target_kode]["overall"]["metrics"]["y_pred"]["rmse"],
            )
            final_info[target_kode] = {
                "model": info,
                "sigma": final["sigma"],
                "n_pasangan": int(len(dataset)),
                "n_siswa": int(dataset["siswa_id"].nunique()),
            }

    if "RATA_RATA" not in target_results:
        raise RuntimeError("Target rata-rata tidak dapat dievaluasi.")

    mean_gate = target_results["RATA_RATA"]["overall"]["gate_passed_stable"]
    published = []
    if mean_gate and not experiment:
        published.append("RATA_RATA")
        for target_kode in MAPEL_UMUM:
            if target_kode in target_results:
                if target_results[target_kode]["overall"]["gate_passed_stable"]:
                    published.append(target_kode)

    summary = {
        "versi": version,
        "dibuat_pada": datetime.now(timezone.utc).isoformat(),
        "protokol": (
            "Protokol_Evaluasi_A1 Revisi 3 (eksploratif)"
            if experiment
            else "Protokol_Evaluasi_A1 Revisi 3"
        ),
        "eksperimen": experiment,
        "variant": args.variant,
        "population": args.population,
        "feature_set": args.feature_set,
        "data_hash": data_hash,
        "jumlah_siswa": int(panel["siswa"]["siswa_id"].nunique()),
        "jumlah_angkatan": int(panel["siswa"]["tahun_lulus"].nunique()),
        "target_utama": target_results["RATA_RATA"],
        "target_per_mapel": {
            key: value for key, value in target_results.items() if key != "RATA_RATA"
        },
        "model_final": final_info,
        "gate": {
            "mean_passed": bool(mean_gate),
            "published_targets": published,
        },
    }

    if experiment:
        _write_json(
            ARTIFACT_DIR / f"experiment_{args.variant}_metrics.json", summary
        )
        if all_predictions:
            pd.concat(all_predictions, ignore_index=True).to_csv(
                ARTIFACT_DIR / f"experiment_{args.variant}_predictions.csv",
                index=False,
            )
        overall = target_results["RATA_RATA"]["overall"]
        print(f"Eksperimen {args.variant} | populasi {args.population} | fitur {args.feature_set}")
        print(f"Jumlah fitur: {target_results['RATA_RATA']['n_features']}")
        print(f"n_siswa: {overall['n_siswa']} | n_pasangan: {overall['n_pasangan']}")
        print(
            "MAE model:",
            round(overall["metrics"]["y_pred"]["mae"], 4),
            "| B0:",
            round(overall["metrics"]["B0"]["mae"], 4),
            "| B2:",
            round(overall["metrics"]["B2"]["mae"], 4),
        )
        print(
            "delta MAE vs B0 =",
            round(overall["delta_vs_b0"], 4),
            "| CI95 =",
            overall["delta_vs_b0_ci95"],
            "| delta vs B2 =",
            round(overall["delta_vs_b2"], 4),
            "CI95 =",
            overall["delta_vs_b2_ci95"],
        )
        print(
            "fold delta vs B0:",
            [round(value, 4) for value in overall["fold_delta_vs_b0"]],
            "| menang",
            f"{overall['folds_won_vs_b0']}/{overall['fold_count']} fold",
            "| gate stabil:",
            "LULUS" if overall["gate_passed_stable"] else "TIDAK LULUS",
        )
        print(
            "fold delta vs B2:",
            [round(value, 4) for value in overall["fold_delta_vs_b2"]],
            "| menang",
            f"{overall['folds_won_vs_b2']}/{overall['fold_count']} fold",
            "| gate B2:",
            "LULUS" if overall["gate_b2_passed"] else "TIDAK LULUS",
        )
        print(
            "Artefak:",
            f"{ARTIFACT_DIR / f'experiment_{args.variant}_metrics.json'}",
        )
        return

    _write_json(ARTIFACT_DIR / "metrics.json", summary)
    _write_json(
        ARTIFACT_DIR / "versi.json",
        {
            "versi": version,
            "dibuat_pada": summary["dibuat_pada"],
            "data_hash": data_hash,
            "published_targets": published,
        },
    )
    if all_predictions:
        pd.concat(all_predictions, ignore_index=True).to_csv(
            ARTIFACT_DIR / "predictions_test.csv", index=False
        )

    print(f"Versi model: {version}")
    print(
        "Gate rata-rata:",
        "LULUS" if mean_gate else "TIDAK LULUS",
        "| delta MAE vs B0 =",
        round(target_results["RATA_RATA"]["overall"]["delta_vs_b0"], 4),
        "| CI95 =",
        target_results["RATA_RATA"]["overall"]["delta_vs_b0_ci95"],
        "| delta MAE vs B2 =",
        round(target_results["RATA_RATA"]["overall"]["delta_vs_b2"], 4),
    )
    print("Target yang boleh diterbitkan:", published)


if __name__ == "__main__":
    main()
