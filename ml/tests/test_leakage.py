import unittest

import numpy as np
import pandas as pd

from ml.features import build_supervised, feature_columns, latest_prediction_rows
from ml.tests.test_features import make_panel
from ml.train import _filter_population, _residual_prediction


class LeakageTests(unittest.TestCase):
    def test_target_columns_are_not_model_features(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        features = feature_columns(data)
        for forbidden in [
            "target_nilai",
            "target_count",
            "semester_target",
            "is_latest_observed",
            "tahun_lulus",
        ]:
            self.assertNotIn(forbidden, features)

    def test_latest_rows_only_for_students_before_semester_six(self):
        data = build_supervised(
            make_panel(5), target_kode="MTK", require_target=False
        )
        latest = latest_prediction_rows(data)
        self.assertEqual(len(latest), 1)
        self.assertEqual(int(latest.iloc[0]["semester_asal"]), 5)
        self.assertEqual(int(latest.iloc[0]["semester_target"]), 6)

        complete = build_supervised(
            make_panel(6), target_kode="MTK", require_target=False
        )
        self.assertEqual(len(latest_prediction_rows(complete)), 0)

    def test_attendance_cumulative_does_not_include_future_semester(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        early = data[data["semester_asal"] == 2].iloc[0]
        later = data[data["semester_asal"] == 4].iloc[0]
        self.assertLess(early["cum_absen"], later["cum_absen"])
        self.assertAlmostEqual(early["cum_absen"], 2.0)
        self.assertAlmostEqual(later["cum_absen"], 4.0)

    def test_rows_are_unique_per_student_and_target_semester(self):
        data = build_supervised(make_panel(6), target_kode="MTK")
        duplicate = data.duplicated(["siswa_id", "semester_target"]).sum()
        self.assertEqual(int(duplicate), 0)

    def test_primary_population_requires_previous_semester_and_nine_subjects(self):
        frame = pd.DataFrame(
            {
                "semester_asal": [1, 2, 2, 3],
                "has_prev": [0, 1, 1, 1],
                "b0_strict": [np.nan, 80.0, 80.0, 80.0],
                "target_count": [9, 9, 8, 9],
            }
        )
        primary = _filter_population(frame, "RATA_RATA", "primary")
        self.assertEqual(len(primary), 2)
        self.assertNotIn(1, primary["semester_asal"].tolist())
        self.assertTrue((primary["target_count"] == 9).all())

    def test_primary_population_excludes_missing_strict_b0(self):
        data = build_supervised(make_panel(5), target_kode="MTK")
        primary = _filter_population(data, "MTK", "primary")
        self.assertTrue((primary["has_prev"] == 1).all())
        self.assertTrue(primary["b0_strict"].notna().all())
        self.assertNotIn(1, primary["semester_asal"].tolist())

    def test_residual_prediction_is_reconstructed_and_clipped(self):
        prediction = _residual_prediction([80.0, 99.0, 10.0], [10.0, 5.0, -20.0])
        self.assertAlmostEqual(prediction[0], 90.0)
        self.assertAlmostEqual(prediction[1], 100.0)
        self.assertAlmostEqual(prediction[2], 0.0)


if __name__ == "__main__":
    unittest.main()
