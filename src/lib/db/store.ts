import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildSeed } from "./seed";
import type { Database } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache: Database | null = null;
let dirty = false;

async function readDb(): Promise<Database> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    cache = JSON.parse(raw) as Database;
  } catch {
    cache = buildSeed();
    dirty = true;
  }
  return cache;
}

let saveQueue: Promise<void> = Promise.resolve();

export async function getDb(): Promise<Database> {
  const db = await readDb();
  if (dirty) {
    dirty = false;
    saveQueue = saveQueue.then(() =>
      fs.mkdir(DATA_DIR, { recursive: true }).then(() =>
        fs.writeFile(DB_FILE, JSON.stringify(db), "utf-8")
      )
    );
  }
  return db;
}

export async function persist(): Promise<void> {
  if (!cache) return;
  dirty = true;
  await getDb();
  await saveQueue;
}

export async function resetDb(): Promise<Database> {
  cache = buildSeed();
  dirty = true;
  await getDb();
  await saveQueue;
  return cache;
}

export function newId(prefix: string, list?: unknown[]): string {
  let id: string;
  do {
    id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (list?.some((item) => (item as { id?: string }).id === id));
  return id;
}
