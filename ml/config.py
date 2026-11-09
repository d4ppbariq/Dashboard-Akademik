import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "ml" / "data" / "raw"
ARTIFACT_DIR = ROOT / "ml" / "artefak"
HARI_EFEKTIF_PATH = ROOT / "config" / "hari-efektif.json"

MAPEL_UMUM = ("BIG", "BIN", "IPA", "IPS", "MTK", "PABP", "PJK", "PPKn", "SUN")
SEMESTER = (1, 2, 3, 4, 5, 6)
HORIZON = (1, 2, 3, 4, 5)
RANDOM_STATE = 42
BOOTSTRAP_REPS = 1000


def load_hari_efektif() -> dict[int, int]:
    data = json.loads(HARI_EFEKTIF_PATH.read_text(encoding="utf-8"))
    return {int(k): int(v) for k, v in data["hariEfektif"].items()}
