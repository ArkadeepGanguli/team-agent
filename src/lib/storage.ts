import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function ensureFile(filePath: string): Promise<void> {
  await ensureDataDir();
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
}

export async function readJSON<T>(filename: string): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  await ensureFile(filePath);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw || "[]") as T;
}

export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await ensureDataDir();
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function appendToJSON<T>(filename: string, item: T): Promise<void> {
  const list = await readJSON<T[]>(filename);
  list.push(item);
  await writeJSON(filename, list);
}

export async function updateInJSON<T extends { id: string }>(
  filename: string,
  id: string,
  updater: (item: T) => T
): Promise<T | null> {
  const list = await readJSON<T[]>(filename);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  list[index] = updater(list[index]);
  await writeJSON(filename, list);
  return list[index];
}