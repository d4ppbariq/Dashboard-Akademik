"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb, persist, newId } from "@/lib/db/store";
import { pushAudit } from "@/lib/audit";

const SiswaSchema = z.object({
  nis: z.string().trim().min(1, "NIS wajib diisi"),
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  jenis_kelamin: z.enum(["L", "P"], { message: "Jenis kelamin harus L atau P" }),
  kelas_id: z.string().min(1),
  id: z.string().optional(),
});

async function guard() {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { user, ok: false as const };
  }
  return { user, ok: true as const };
}

export async function addSiswa(formData: FormData): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const parsed = SiswaSchema.safeParse({
    nis: formData.get("nis"),
    nama: formData.get("nama"),
    jenis_kelamin: formData.get("jenis_kelamin"),
    kelas_id: formData.get("kelas_id"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.nis?.[0] ?? f.nama?.[0] ?? f.jenis_kelamin?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  const { nis, nama, jenis_kelamin, kelas_id } = parsed.data;

  if (!db.kelas.some((k) => k.id === kelas_id)) {
    return { error: "Kelas tidak valid" };
  }
  if (db.siswa.some((s) => s.nis === nis && s.kelas_id === kelas_id)) {
    return { error: `NIS ${nis} sudah ada di kelas ini` };
  }

  db.siswa.push({
    id: newId("s", db.siswa),
    kelas_id,
    nis,
    nama,
    jenis_kelamin,
  });

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "CREATE",
    entitas: "siswa",
    detail: `Menambahkan siswa ${nama} (NIS ${nis})`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
  return {};
}

export async function updateSiswa(formData: FormData): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ID siswa tidak valid" };

  const parsed = SiswaSchema.partial({ kelas_id: true }).safeParse({
    nis: formData.get("nis"),
    nama: formData.get("nama"),
    jenis_kelamin: formData.get("jenis_kelamin"),
    id,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.nis?.[0] ?? f.nama?.[0] ?? f.jenis_kelamin?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  const siswa = db.siswa.find((s) => s.id === id);
  if (!siswa) return { error: "Siswa tidak ditemukan" };

  const { nis, nama, jenis_kelamin } = parsed.data;
  if (nis !== siswa.nis && db.siswa.some((s) => s.nis === nis && s.kelas_id === siswa.kelas_id)) {
    return { error: `NIS ${nis} sudah digunakan siswa lain di kelas ini` };
  }

  siswa.nis = nis;
  siswa.nama = nama;
  siswa.jenis_kelamin = jenis_kelamin;

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "UPDATE",
    entitas: "siswa",
    detail: `Mengubah data siswa ${nama} (NIS ${nis})`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteSiswa(siswaId: string): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  const siswa = db.siswa.find((s) => s.id === siswaId);
  if (!siswa) return { error: "Siswa tidak ditemukan" };

  db.siswa = db.siswa.filter((s) => s.id !== siswaId);
  db.nilai_siswa = db.nilai_siswa.filter((n) => n.siswa_id !== siswaId);
  db.kehadiran_siswa = db.kehadiran_siswa.filter((k) => k.siswa_id !== siswaId);

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "DELETE",
    entitas: "siswa",
    detail: `Menghapus siswa ${siswa.nama} (NIS ${siswa.nis}) beserta data nilai dan kehadiran`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
  return {};
}

export async function clearKelas(kelasId: string): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  const kelas = db.kelas.find((k) => k.id === kelasId);
  if (!kelas) return { error: "Kelas tidak ditemukan" };

  const siswaIds = db.siswa.filter((s) => s.kelas_id === kelasId).map((s) => s.id);
  const set = new Set(siswaIds);

  const jumlah = siswaIds.length;
  db.siswa = db.siswa.filter((s) => !set.has(s.id));
  db.nilai_siswa = db.nilai_siswa.filter((n) => !set.has(n.siswa_id));
  db.kehadiran_siswa = db.kehadiran_siswa.filter((k) => !set.has(k.siswa_id));

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "DELETE",
    entitas: "kelas",
    detail: `Mengosongkan kelas ${kelas.nama_kelas}: ${jumlah} siswa beserta data nilai dan kehadiran dihapus`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
  return {};
}
