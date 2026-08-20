import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildSeed } from "./seed";
import type { Database } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function readDb(): Promise<Database> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(raw) as Database;
  } catch {
    const seed = buildSeed();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(seed), "utf-8");
    return seed;
  }
}

let saveQueue: Promise<void> = Promise.resolve();

export async function getDb(): Promise<Database> {
  return readDb();
}

export async function persist(data: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  saveQueue = saveQueue.then(() =>
    fs.writeFile(DB_FILE, JSON.stringify(data), "utf-8")
  );
  await saveQueue;
}

export async function resetDb(): Promise<Database> {
  const seed = buildSeed();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(seed), "utf-8");
  return seed;
}

export function newId(prefix: string, list?: unknown[]): string {
  let id: string;
  do {
    id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (list?.some((item) => (item as { id?: string }).id === id));
  return id;
}
