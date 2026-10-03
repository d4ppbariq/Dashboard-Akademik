import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSessionPayload,
  resolveCookieSecure,
  resolveSessionSecret,
  SESSION_COOKIE,
  SESSION_SECRET_MIN,
  SESSION_TTL_HARI,
  SESSION_TTL_JWT,
  SESSION_TTL_MS,
} from "./token";

const SECRET_SAH = "a".repeat(SESSION_SECRET_MIN);

test("masa berlaku dibaca dari satu konstanta", () => {
  assert.equal(SESSION_TTL_HARI, 7);
  assert.equal(SESSION_TTL_JWT, "7d");
  assert.equal(SESSION_TTL_MS, 7 * 24 * 60 * 60 * 1000);
});

test("nilai untuk maxAge adalah detik yang utuh", () => {
  // setExpirationTime("7d") dan maxAge harus berasal dari nilai yang sama.
  assert.equal(Math.floor(SESSION_TTL_MS / 1000), 604800);
  assert.equal(Number.isInteger(SESSION_TTL_MS / 1000), true);
});

test("nama cookie adalah satu konstanta", () => {
  // proxy.ts dan session.ts harus memakai nama yang sama.
  assert.equal(SESSION_COOKIE, "session");
});

test("SESSION_SECRET yang sah diterima", () => {
  assert.equal(resolveSessionSecret(SECRET_SAH), SECRET_SAH);
});

test("SESSION_SECRET kosong ditolak, bukan dipakai sebagai nilai cadangan", () => {
  // Inilah bug yang ditutup: nilai fallback di dalam kode membuat instalasi
  // yang lupa mengisi .env berjalan dengan kunci yang tertulis di repositori.
  assert.throws(() => resolveSessionSecret(undefined), /SESSION_SECRET/);
  assert.throws(() => resolveSessionSecret(""), /SESSION_SECRET/);
  assert.throws(() => resolveSessionSecret("   "), /SESSION_SECRET/);
});

test("SESSION_SECRET pendek ditolak beserta panjangnya", () => {
  assert.throws(
    () => resolveSessionSecret("a".repeat(SESSION_SECRET_MIN - 1)),
    /terlalu pendek/
  );
});

test("spasi di sekitar SESSION_SECRET dibuang sebelum diukur", () => {
  const secret = `  ${SECRET_SAH}  `;
  assert.equal(resolveSessionSecret(secret), SECRET_SAH);
});

test("COOKIE_SECURE dibaca hanya dari true atau false", () => {
  assert.equal(resolveCookieSecure("true"), true);
  assert.equal(resolveCookieSecure("false"), false);
});

test("COOKIE_SECURE kosong ditolak, bukan dianggap false", () => {
  // Versi lama memakai === "true", sehingga variabel yang lupa diisi berakhir
  // menjadi false: cookie dikirim tanpa TLS tanpa ada yang menyadari.
  assert.throws(() => resolveCookieSecure(undefined), /COOKIE_SECURE/);
  assert.throws(() => resolveCookieSecure(""), /COOKIE_SECURE/);
  assert.throws(() => resolveCookieSecure("   "), /COOKIE_SECURE/);
});

test("COOKIE_SECURE menolak nilai yang mirip tapi tidak tepat", () => {
  assert.throws(() => resolveCookieSecure("TRUE"), /COOKIE_SECURE/);
  assert.throws(() => resolveCookieSecure("False"), /COOKIE_SECURE/);
  assert.throws(() => resolveCookieSecure("1"), /COOKIE_SECURE/);
  assert.throws(() => resolveCookieSecure("yes"), /COOKIE_SECURE/);
});

const PAYLOAD_SAH = {
  userId: "u-1",
  nama: "Guru",
  roleId: "role-guru",
  roleName: "Guru",
};

test("payload lengkap diterima", () => {
  assert.deepEqual(parseSessionPayload(PAYLOAD_SAH), PAYLOAD_SAH);
});

test("payload tanpa userId ditolak", () => {
  const { userId, ...tanpaUserId } = PAYLOAD_SAH;
  assert.equal(parseSessionPayload(tanpaUserId), null);
  assert.equal(userId, "u-1");
});

test("payload dengan userId kosong ditolak", () => {
  assert.equal(parseSessionPayload({ ...PAYLOAD_SAH, userId: "" }), null);
});

test("payload dengan tipe salah ditolak", () => {
  assert.equal(parseSessionPayload({ ...PAYLOAD_SAH, nama: 42 }), null);
  assert.equal(parseSessionPayload({ ...PAYLOAD_SAH, roleId: null }), null);
});

test("payload kosong atau bukan objek ditolak", () => {
  assert.equal(parseSessionPayload({}), null);
  assert.equal(parseSessionPayload(null), null);
  assert.equal(parseSessionPayload("token"), null);
});

test("field tambahan di luar skema dibuang, bukan dipercaya", () => {
  // Token yang tanda tangannya sah tetap boleh membawa field asing, tapi field
  // itu tidak boleh ikut terbaca sebagai SessionPayload.
  const hasil = parseSessionPayload({ ...PAYLOAD_SAH, isSystem: true, exp: 1 });
  assert.deepEqual(hasil, PAYLOAD_SAH);
  assert.equal("isSystem" in (hasil ?? {}), false);
  assert.equal("exp" in (hasil ?? {}), false);
});

test("roleId di dalam token diteruskan apa adanya, bukan dipakai otorisasi", () => {
  // Catatan disengaja: hasPermission dan hasRouteAccess selalu membaca role
  // dari database, jadi roleId di token hanya untuk tampilan.
  const hasil = parseSessionPayload({ ...PAYLOAD_SAH, roleId: "role-superadmin" });
  assert.equal(hasil?.roleId, "role-superadmin");
});

test("payload yang tidak berupa objek tidak menyebabkan galat", () => {
  for (const masukan of [undefined, 0, false, [], [{ userId: "u-1" }]]) {
    assert.doesNotThrow(() => parseSessionPayload(masukan));
  }
});