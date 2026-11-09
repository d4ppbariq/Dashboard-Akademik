import unittest

import numpy as np
import pandas as pd

from ml.baselines import all_baselines, b0_previous
from ml.config import MAPEL_UMUM
from ml.features import (
    CORE_FEATURES,
    V2_FEATURES,
    V3_FEATURES,
    build_supervised,
    core_feature_columns,
    feature_columns,
    v2_feature_columns,
    v3_feature_columns,
)


def make_panel(n_semesters: int = 5) -> dict[str, pd.DataFrame]:
    siswa = pd.DataFrame(
        [
            {
                "siswa_id": "s1",
                "nis": "1",
                "nama": "A",
                "kelas_id": "k1",
                "nama_kelas": "A",
                "angkatan_id": "a1",
                "tahun_lulus": 2026,
                "jenis_kelamin": "L",
            }
        ]
    )
    nilai = pd.DataFrame(
        [
            {
                "siswa_id": "s1",
                "semester": semester,
                "kode": kode,
                "nilai": 60 + semester,
            }
            for semester in range(1, n_semesters + 1)
            for kode in MAPEL_UMUM
        ]
    )
    kehadiran = pd.DataFrame(
        [
            {
                "siswa_id": "s1",
                "semester": semester,
                "sakit": 1,
                "izin": 0,
                "tanpa_keterangan": 0,
                "hari_efektif": 100,
                "absen_total": 1,
                "rasio_hadir": 0.99,
                "melebihi_hari_efektif": 0,
            }
            for semester in range(1, n_semesters + 1)
        ]
    )
    return {
        "siswa": siswa,
        "mapel": pd.DataFrame(),
        "nilai": nilai,
        "nilai_umum": nilai,
        "kehadiran": kehadiran,
    }


def make_late_entry_panel(start_semester: int = 3) -> dict[str, pd.DataFrame]:
    panel = make_panel(5)
    nilai = panel["nilai"][panel["nilai"]["semester"] >= start_semester]
    return {
        **panel,
        "nilai": nilai,
        "nilai_umum": nilai,
        "kehadiran": panel["kehadiran"][
            panel["kehadiran"]["semester"] >= start_semester
        ],
    }


class FeatureTests(unittest.TestCase):
    def test_core_feature_set_is_frozen_at_nineteen(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        features = core_feature_columns(data)
        self.assertEqual(len(features), 19)
        self.assertEqual(tuple(features), CORE_FEATURES)
        for forbidden in [
            "target_nilai",
            "target_count",
            "semester_target",
            "has_prev",
            "cold_start",
            "b0_strict",
        ]:
            self.assertNotIn(forbidden, features)

    def test_history_flags_for_full_history_student(self):
        data = build_supervised(make_panel(5), target_kode="RATA_RATA")
        first = data[data["semester_asal"] == 1].iloc[0]
        self.assertEqual(int(first["has_prev"]), 0)
        self.assertEqual(int(first["cold_start"]), 1)
        self.assertEqual(int(first["first_sem"]), 1)
        self.assertEqual(int(first["late_entry"]), 0)
        self.assertEqual(int(first["n_missing_early"]), 0)
        self.assertEqual(int(first["semester_sejak_masuk"]), 1)
        self.assertEqual(int(first["n_observed_before"]), 1)
        self.assertAlmostEqual(first["b0_strict"], 61.0)

        third = data[data["semester_asal"] == 3].iloc[0]
        self.assertEqual(int(third["has_prev"]), 1)
        self.assertEqual(int(third["cold_start"]), 0)
        self.assertEqual(int(third["n_observed_before"]), 3)
        self.assertAlmostEqual(third["b0_strict"], 63.0)

    def test_late_entry_student_is_cold_start_at_first_observed_semester(self):
        data = build_supervised(make_late_entry_panel(3), target_kode="MTK")
        row3 = data[data["semester_asal"] == 3].iloc[0]
        self.assertEqual(int(row3["has_prev"]), 0)
        self.assertEqual(int(row3["cold_start"]), 1)
        self.assertEqual(int(row3["first_sem"]), 3)
        self.assertEqual(int(row3["late_entry"]), 1)
        self.assertEqual(int(row3["n_missing_early"]), 2)
        self.assertEqual(int(row3["semester_sejak_masuk"]), 1)
        self.assertAlmostEqual(row3["b0_strict"], 63.0)

        row4 = data[data["semester_asal"] == 4].iloc[0]
        self.assertEqual(int(row4["has_prev"]), 1)
        self.assertEqual(int(row4["cold_start"]), 0)
        self.assertEqual(int(row4["semester_sejak_masuk"]), 2)
        self.assertAlmostEqual(row4["b0_strict"], 64.0)

    def test_strict_b0_is_clipped_and_accepts_nan(self):
        data = pd.DataFrame(
            {
                "b0_strict": [85.0, np.nan],
                "avg_k": [90.0, 70.0],
                "angkatan_avg_target_k": [86.0, np.nan],
            }
        )
        strict = all_baselines(data, "RATA_RATA", strict=True)
        self.assertAlmostEqual(strict["B0"][0], 85.0)
        self.assertTrue(np.isnan(strict["B0"][1]))
        self.assertAlmostEqual(strict["B2"][0], 86.0)
        self.assertTrue(np.isnan(b0_previous(data)[1]))

    def test_target_is_next_semester_and_current_feature_is_current(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        first = data[data["semester_asal"] == 1].iloc[0]
        self.assertEqual(first["nilai_MTK_k"], 61)
        self.assertAlmostEqual(first["target_nilai"], 62.0)

        last = data[data["semester_asal"] == 4].iloc[0]
        self.assertEqual(last["nilai_MTK_k"], 64)
        self.assertAlmostEqual(last["target_nilai"], 65.0)

    def test_attendance_uses_only_semesters_up_to_k(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        row = data[data["semester_asal"] == 3].iloc[0]
        self.assertAlmostEqual(row["cum_sakit"], 3.0)
        self.assertAlmostEqual(row["cum_absen"], 3.0)
        self.assertAlmostEqual(row["rasio_hadir_cum"], 0.99)

    def test_v2_feature_set_is_frozen_at_twenty_three(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        features = v2_feature_columns(data)
        self.assertEqual(len(features), 23)
        self.assertEqual(tuple(features), V2_FEATURES)
        self.assertEqual(tuple(features[:19]), CORE_FEATURES)

    def test_v2_extras_do_not_leak_into_production_features(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        production = feature_columns(data)
        for extra in V2_FEATURES[19:]:
            self.assertNotIn(extra, production)

    def test_v2_hinge_and_interactions_use_current_history(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        row = data[data["semester_asal"] == 3].iloc[0]
        self.assertAlmostEqual(row["last_available_avg"], 63.0)
        self.assertAlmostEqual(row["hinge_70"], 7.0)
        self.assertAlmostEqual(row["hinge_80"], 0.0)
        self.assertAlmostEqual(row["semester_sejak_masuk"], 3.0)
        self.assertAlmostEqual(row["ix_sejak_avg"], 189.0)
        self.assertAlmostEqual(row["trend_slope"], 1.0)
        self.assertAlmostEqual(row["ix_semester_trend"], 3.0)

    def test_v2_hinge_above_eighty(self):
        panel = make_panel(3)
        panel["nilai"]["nilai"] = 85.0
        panel["nilai_umum"] = panel["nilai"]
        data = build_supervised(panel, target_kode="MTK")
        row = data[data["semester_asal"] == 2].iloc[0]
        self.assertAlmostEqual(row["hinge_70"], 0.0)
        self.assertAlmostEqual(row["hinge_80"], 5.0)

    def test_v3_feature_set_is_frozen_at_twenty(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        features = v3_feature_columns(data)
        self.assertEqual(len(features), 20)
        self.assertEqual(tuple(features), V3_FEATURES)
        self.assertEqual(tuple(features[:19]), CORE_FEATURES)
        self.assertNotIn("b2_delta", feature_columns(data))

    def test_v3_b2_delta_follows_rule(self):
        low = build_supervised(make_panel(5), target_kode="MTK")
        row = low[low["semester_asal"] == 3].iloc[0]
        self.assertAlmostEqual(row["b2_delta"], -5.0)

        mid_panel = make_panel(3)
        mid_panel["nilai"]["nilai"] = 75.0
        mid_panel["nilai_umum"] = mid_panel["nilai"]
        mid = build_supervised(mid_panel, target_kode="MTK")
        self.assertAlmostEqual(
            mid[mid["semester_asal"] == 2].iloc[0]["b2_delta"], 0.0
        )

        high_panel = make_panel(3)
        high_panel["nilai"]["nilai"] = 85.0
        high_panel["nilai_umum"] = high_panel["nilai"]
        high = build_supervised(high_panel, target_kode="MTK")
        self.assertAlmostEqual(
            high[high["semester_asal"] == 2].iloc[0]["b2_delta"], 1.0
        )

    def test_baselines_are_defined_and_clipped(self):
        data = pd.DataFrame(
            {
                "last_available_avg": [85.0, 20.0],
                "avg_k": [85.0, 20.0],
                "angkatan_avg_target_k": [86.0, np.nan],
                "last_MTK_k": [80.0, 30.0],
                "nilai_MTK_k": [80.0, 30.0],
            }
        )
        result = all_baselines(data, "MTK")
        self.assertListEqual(list(result), ["B0", "B1", "B2"])
        for values in result.values():
            self.assertTrue(np.all(values >= 0))
            self.assertTrue(np.all(values <= 100))
        self.assertAlmostEqual(result["B1"][0], 86.0)
        self.assertAlmostEqual(result["B1"][1], 30.0)


if __name__ == "__main__":
    unittest.main()
