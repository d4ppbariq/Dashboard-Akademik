import unittest

import numpy as np
import pandas as pd

from ml.publish_b2 import _filter_primary, _passes_gate, evaluate_target


def make_primary_frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "siswa_id": ["s1", "s1", "s2", "s2"],
            "tahun_lulus": [2025, 2025, 2026, 2026],
            "semester_asal": [1, 2, 2, 3],
            "has_prev": [0, 1, 1, 1],
            "b0_strict": [np.nan, 60.0, 85.0, 85.0],
            "avg_k": [60.0, 60.0, 85.0, 85.0],
            "target_count": [9, 9, 8, 9],
            "target_nilai": [60.0, 55.0, 86.0, 86.0],
        }
    )


class PublishB2Tests(unittest.TestCase):
    def test_primary_filter_requires_history_and_nine_subjects(self):
        frame = make_primary_frame()
        primary = _filter_primary(frame, "RATA_RATA")
        self.assertEqual(len(primary), 2)
        self.assertNotIn(1, primary["semester_asal"].tolist())
        self.assertTrue((primary["target_count"] == 9).all())

    def test_gate_requires_all_folds_and_ci_below_zero(self):
        self.assertTrue(_passes_gate(0.8, 1.3, (-0.7, -0.2), [-0.4, -0.5]))
        self.assertFalse(_passes_gate(0.8, 1.3, (-0.7, 0.1), [-0.4, -0.5]))
        self.assertFalse(_passes_gate(0.8, 1.3, (-0.7, -0.2), [-0.4, 0.1]))
        self.assertFalse(_passes_gate(1.4, 1.3, (-0.7, -0.2), [-0.4, -0.5]))

    def test_evaluate_target_reports_b2_against_b0(self):
        result = evaluate_target(
            make_primary_frame(), "RATA_RATA", reps=20
        )
        self.assertEqual(result["jenis"], "rule-engine")
        self.assertEqual(result["n_siswa"], 2)
        self.assertEqual(result["n_pasangan"], 2)
        self.assertGreaterEqual(result["sigma"], 0.0)
        self.assertEqual(len(result["delta_ci95"]), 2)
        self.assertEqual(len(result["fold_deltas"]), 2)
        self.assertEqual(result["passed"], _passes_gate(
            result["mae_b2"],
            result["mae_b0"],
            tuple(result["delta_ci95"]),
            result["fold_deltas"],
        ))


if __name__ == "__main__":
    unittest.main()
