import pandas as pd

from .config import MAPEL_UMUM, RAW_DIR, load_hari_efektif


def _read(name: str) -> pd.DataFrame:
    path = RAW_DIR / f"{name}.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"{path} belum ada. Jalankan `node ml/extract.mjs` terlebih dahulu."
        )
    return pd.read_csv(path)


def load_raw() -> dict[str, pd.DataFrame]:
    return {
        "angkatan": _read("angkatan"),
        "kelas": _read("kelas"),
        "siswa": _read("siswa"),
        "mapel": _read("mapel"),
        "nilai": _read("nilai"),
        "kehadiran": _read("kehadiran"),
    }


def build_panel() -> dict[str, pd.DataFrame]:
    raw = load_raw()

    siswa = (
        raw["siswa"]
        .merge(raw["kelas"], on="kelas_id", how="left", validate="many_to_one")
        .merge(raw["angkatan"], on="angkatan_id", how="left", validate="many_to_one")
    )
    if siswa[["angkatan_id", "tahun_lulus"]].isna().any().any():
        raise ValueError("Ada siswa tanpa kelas/angkatan yang valid.")

    nilai = raw["nilai"].merge(
        raw["mapel"], on="mapel_id", how="left", validate="many_to_one"
    )
    if nilai["kode"].isna().any():
        raise ValueError("Ada nilai dengan mata pelajaran yang tidak dikenal.")

    kehadiran = raw["kehadiran"].copy()
    hari = load_hari_efektif()
    kehadiran["hari_efektif"] = kehadiran["semester"].map(hari)
    kehadiran["absen_total"] = (
        kehadiran["sakit"] + kehadiran["izin"] + kehadiran["tanpa_keterangan"]
    )
    kehadiran["rasio_hadir"] = (
        (kehadiran["hari_efektif"] - kehadiran["absen_total"])
        / kehadiran["hari_efektif"]
    ).clip(lower=0, upper=1)
    kehadiran["melebihi_hari_efektif"] = (
        kehadiran["absen_total"] > kehadiran["hari_efektif"]
    ).astype(int)

    mapel_umum = nilai[nilai["kode"].isin(MAPEL_UMUM)]
    if mapel_umum.empty:
        raise ValueError("Tidak ada nilai pada 9 mapel umum.")

    return {
        "siswa": siswa,
        "mapel": raw["mapel"],
        "nilai": nilai,
        "nilai_umum": mapel_umum,
        "kehadiran": kehadiran,
    }
