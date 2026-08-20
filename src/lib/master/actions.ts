"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb, persist, newId } from "@/lib/db/store";
import { pushAudit } from "@/lib/audit";

const HURUF_KELAS = ["A", "B", "C", "D", "E", "F"];

const AngkatanSchema = z.object({
  tahun_lulus: z.number().int().min(2000).max(2100),
});

const KelasSchema = z.object({
  angkatan_id: z.string().min(1),
  nama_kelas: z
    .string()
    .trim()
    .min(1)
    .max(2)
    .regex(/^[A-Z]$/, "Nama kelas harus satu huruf kapital (contoh: A)"),
});

const MapelSchema = z.object({
  kode: z
    .string()
    .trim()
    .min(1)
    .max(5)
    .regex(/^[A-Z0-9]+$/, "Kode harus huruf/angka kapital tanpa spasi"),
  nama_mapel: z.string().trim().min(2, "Nama mapel minimal 2 karakter"),
});

function formNumber(formData: FormData, key: string): number | null {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : null;
}

export async function addAngkatan(formData: FormData): Promise<{ error?: string }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { error: "Anda tidak memiliki izin menulis master data" };
  }

  const tahun = formNumber(formData, "tahun_lulus");
  const parsed = AngkatanSchema.safeParse({ tahun_lulus: tahun });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.tahun_lulus?.[0] ?? "Tahun tidak valid" };
  }

  const db = await getDb();
  if (db.angkatan.some((a) => a.tahun_lulus === parsed.data.tahun_lulus)) {
    return { error: `Angkatan ${parsed.data.tahun_lulus} sudah ada` };
  }

  const id = newId("angkatan", db.angkatan);
  db.angkatan.push({ id, tahun_lulus: parsed.data.tahun_lulus });
  for (const huruf of HURUF_KELAS) {
    db.kelas.push({ id: `${id}-${huruf}`, angkatan_id: id, nama_kelas: huruf });
  }

  pushAudit(db, {
    user_id: user.id,
    user_nama: user.nama,
    aksi: "CREATE",
    entitas: "angkatan",
    detail: `Menambahkan angkatan ${parsed.data.tahun_lulus} beserta 6 kelas`,
  });
  await persist(db);

  revalidatePath("/master");
  revalidatePath("/dashboard");
  return {};
}

export async function addKelas(formData: FormData): Promise<{ error?: string }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { error: "Anda tidak memiliki izin menulis master data" };
  }

  const parsed = KelasSchema.safeParse({
    angkatan_id: formData.get("angkatan_id"),
    nama_kelas: formData.get("nama_kelas"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.nama_kelas?.[0] ?? "Data kelas tidak valid" };
  }

  const db = await getDb();
  const exists = db.kelas.some(
    (k) =>
      k.angkatan_id === parsed.data.angkatan_id &&
      k.nama_kelas === parsed.data.nama_kelas
  );
  if (exists) return { error: "Kelas tersebut sudah ada" };

  db.kelas.push({
    id: `${parsed.data.angkatan_id}-${parsed.data.nama_kelas}`,
    angkatan_id: parsed.data.angkatan_id,
    nama_kelas: parsed.data.nama_kelas,
  });

  pushAudit(db, {
    user_id: user.id,
    user_nama: user.nama,
    aksi: "CREATE",
    entitas: "kelas",
    detail: `Menambahkan kelas ${parsed.data.nama_kelas}`,
  });
  await persist(db);

  revalidatePath("/master");
  return {};
}

export async function addMapel(formData: FormData): Promise<{ error?: string }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { error: "Anda tidak memiliki izin menulis master data" };
  }

  const parsed = MapelSchema.safeParse({
    kode: formData.get("kode"),
    nama_mapel: formData.get("nama_mapel"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.kode?.[0] ?? f.nama_mapel?.[0] ?? "Data mapel tidak valid" };
  }

  const db = await getDb();
  const kode = parsed.data.kode.toUpperCase();
  if (db.mata_pelajaran.some((m) => m.kode === kode)) {
    return { error: `Kode ${kode} sudah digunakan` };
  }

  db.mata_pelajaran.push({
    id: `mp-${kode.toLowerCase()}`,
    kode,
    nama_mapel: parsed.data.nama_mapel,
    urutan: db.mata_pelajaran.length + 1,
  });

  pushAudit(db, {
    user_id: user.id,
    user_nama: user.nama,
    aksi: "CREATE",
    entitas: "mata_pelajaran",
    detail: `Menambahkan mapel ${kode} - ${parsed.data.nama_mapel}`,
  });
  await persist(db);

  revalidatePath("/master");
  return {};
}

export async function deleteMapel(mapelId: string): Promise<{ error?: string }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { error: "Anda tidak memiliki izin menulis master data" };
  }

  const db = await getDb();
  const mapel = db.mata_pelajaran.find((m) => m.id === mapelId);
  if (!mapel) return { error: "Mapel tidak ditemukan" };

  db.mata_pelajaran = db.mata_pelajaran.filter((m) => m.id !== mapelId);
  db.nilai_siswa = db.nilai_siswa.filter((n) => n.mata_pelajaran_id !== mapelId);

  pushAudit(db, {
    user_id: user.id,
    user_nama: user.nama,
    aksi: "DELETE",
    entitas: "mata_pelajaran",
    detail: `Menghapus mapel ${mapel.kode} - ${mapel.nama_mapel}`,
  });
  await persist(db);

  revalidatePath("/master");
  return {};
}

export async function deleteAngkatan(angkatanId: string): Promise<{ error?: string }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { error: "Anda tidak memiliki izin menulis master data" };
  }

  const db = await getDb();
  const angkatan = db.angkatan.find((a) => a.id === angkatanId);
  if (!angkatan) return { error: "Angkatan tidak ditemukan" };

  const kelasIds = db.kelas.filter((k) => k.angkatan_id === angkatanId).map((k) => k.id);
  const siswaIds = db.siswa.filter((s) => kelasIds.includes(s.kelas_id)).map((s) => s.id);
  const set = new Set(siswaIds);

  db.angkatan = db.angkatan.filter((a) => a.id !== angkatanId);
  db.kelas = db.kelas.filter((k) => !kelasIds.includes(k.id));
  db.siswa = db.siswa.filter((s) => !set.has(s.id));
  db.nilai_siswa = db.nilai_siswa.filter((n) => !set.has(n.siswa_id));
  db.kehadiran_siswa = db.kehadiran_siswa.filter((k) => !set.has(k.siswa_id));

  pushAudit(db, {
    user_id: user.id,
    user_nama: user.nama,
    aksi: "DELETE",
    entitas: "angkatan",
    detail: `Menghapus angkatan ${angkatan.tahun_lulus} beserta seluruh data turunannya`,
  });
  await persist(db);

  redirect("/master");
}

export async function deleteKelas(kelasId: string): Promise<{ error?: string }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { error: "Anda tidak memiliki izin menulis master data" };
  }

  const db = await getDb();
  const kelas = db.kelas.find((k) => k.id === kelasId);
  if (!kelas) return { error: "Kelas tidak ditemukan" };

  const siswaIds = db.siswa.filter((s) => s.kelas_id === kelasId).map((s) => s.id);
  const set = new Set(siswaIds);

  db.kelas = db.kelas.filter((k) => k.id !== kelasId);
  db.siswa = db.siswa.filter((s) => !set.has(s.id));
  db.nilai_siswa = db.nilai_siswa.filter((n) => !set.has(n.siswa_id));
  db.kehadiran_siswa = db.kehadiran_siswa.filter((k) => !set.has(k.siswa_id));

  pushAudit(db, {
    user_id: user.id,
    user_nama: user.nama,
    aksi: "DELETE",
    entitas: "kelas",
    detail: `Menghapus kelas ${kelas.nama_kelas} beserta siswanya`,
  });
  await persist(db);

  revalidatePath("/master");
  return {};
}

export async function getImportMeta() {
  const db = await getDb();
  const angkatanSorted = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);
  return {
    angkatan: angkatanSorted.map((a) => ({
      id: a.id,
      tahunLulus: a.tahun_lulus,
      kelas: db.kelas
        .filter((k) => k.angkatan_id === a.id)
        .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas))
        .map((k) => ({ id: k.id, nama: k.nama_kelas })),
    })),
    mapel: db.mata_pelajaran
      .sort((a, b) => a.urutan - b.urutan)
      .map((m) => ({ kode: m.kode, nama: m.nama_mapel })),
  };
}
