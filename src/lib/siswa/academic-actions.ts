"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb, persist, newId } from "@/lib/db/store";
import { pushAudit } from "@/lib/audit";

async function guard() {
  const user = await requireAuth();
  if (!(await hasPermission(user, "master.write"))) {
    return { user, ok: false as const };
  }
  return { user, ok: true as const };
}

const NilaiSchema = z.object({
  siswa_id: z.string().min(1),
  mata_pelajaran_id: z.string().min(1),
  semester: z.coerce.number().int().min(1).max(6),
  nilai: z.coerce.number().min(0).max(100),
  id: z.string().optional(),
});

const KehadiranSchema = z.object({
  siswa_id: z.string().min(1),
  semester: z.coerce.number().int().min(1).max(6),
  sakit: z.coerce.number().int().min(0),
  izin: z.coerce.number().int().min(0),
  tanpa_keterangan: z.coerce.number().int().min(0),
  id: z.string().optional(),
});

export async function addNilai(formData: FormData): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const parsed = NilaiSchema.safeParse({
    siswa_id: formData.get("siswa_id"),
    mata_pelajaran_id: formData.get("mata_pelajaran_id"),
    semester: formData.get("semester"),
    nilai: formData.get("nilai"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.nilai?.[0] ?? f.mata_pelajaran_id?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  const { siswa_id, mata_pelajaran_id, semester, nilai } = parsed.data;

  if (!db.siswa.some((s) => s.id === siswa_id)) return { error: "Siswa tidak valid" };
  if (!db.mata_pelajaran.some((m) => m.id === mata_pelajaran_id)) return { error: "Mapel tidak valid" };

  const existing = db.nilai_siswa.find(
    (n) => n.siswa_id === siswa_id && n.mata_pelajaran_id === mata_pelajaran_id && n.semester === semester
  );
  if (existing) return { error: "Nilai untuk mapel & semester ini sudah ada, gunakan edit" };

  db.nilai_siswa.push({
    id: newId("n", db.nilai_siswa),
    siswa_id,
    mata_pelajaran_id,
    semester,
    nilai,
  });

  const siswa = db.siswa.find((s) => s.id === siswa_id);
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "CREATE",
    entitas: "nilai",
    detail: `Menambahkan nilai ${nilai} untuk siswa ${siswa?.nama ?? siswa_id}`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/dashboard");
  return {};
}

export async function updateNilai(formData: FormData): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ID nilai tidak valid" };

  const parsed = NilaiSchema.safeParse({
    siswa_id: formData.get("siswa_id"),
    mata_pelajaran_id: formData.get("mata_pelajaran_id"),
    semester: formData.get("semester"),
    nilai: formData.get("nilai"),
    id,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.nilai?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  const record = db.nilai_siswa.find((n) => n.id === id);
  if (!record) return { error: "Data nilai tidak ditemukan" };

  record.nilai = parsed.data.nilai;

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "UPDATE",
    entitas: "nilai",
    detail: `Mengubah nilai menjadi ${parsed.data.nilai}`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteNilai(nilaiId: string): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  const record = db.nilai_siswa.find((n) => n.id === nilaiId);
  if (!record) return { error: "Data nilai tidak ditemukan" };

  db.nilai_siswa = db.nilai_siswa.filter((n) => n.id !== nilaiId);

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "DELETE",
    entitas: "nilai",
    detail: `Menghapus data nilai`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/dashboard");
  return {};
}

export async function upsertKehadiran(formData: FormData): Promise<{ error?: string }> {
  const g = await guard();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const parsed = KehadiranSchema.safeParse({
    siswa_id: formData.get("siswa_id"),
    semester: formData.get("semester"),
    sakit: formData.get("sakit"),
    izin: formData.get("izin"),
    tanpa_keterangan: formData.get("tanpa_keterangan"),
    id: formData.get("id") || undefined,
  });
  if (!parsed.success) {
    return { error: "Data kehadiran tidak valid" };
  }

  const db = await getDb();
  const { siswa_id, semester, sakit, izin, tanpa_keterangan } = parsed.data;

  if (!db.siswa.some((s) => s.id === siswa_id)) return { error: "Siswa tidak valid" };

  const existing = db.kehadiran_siswa.find(
    (k) => k.siswa_id === siswa_id && k.semester === semester
  );

  if (existing) {
    existing.sakit = sakit;
    existing.izin = izin;
    existing.tanpa_keterangan = tanpa_keterangan;
  } else {
    db.kehadiran_siswa.push({
      id: newId("k", db.kehadiran_siswa),
      siswa_id,
      semester,
      sakit,
      izin,
      tanpa_keterangan,
    });
  }

  const siswa = db.siswa.find((s) => s.id === siswa_id);
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: existing ? "UPDATE" : "CREATE",
    entitas: "kehadiran",
    detail: `${existing ? "Mengubah" : "Menambahkan"} kehadiran semester ${semester} siswa ${siswa?.nama ?? siswa_id}`,
  });
  await persist();
  revalidatePath("/akademik");
  revalidatePath("/dashboard");
  return {};
}
