import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;
let local: Promise<PGlite> | undefined;

function migrationsDir(): string {
  return path.join(process.cwd(), "migrations");
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows as T[];
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  return (await (await local).query<T>(text, params)).rows;
}

export async function withTransaction<T>(
  fn: (query: typeof sql) => Promise<T>,
): Promise<T> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const txSql = async <R = Record<string, unknown>>(
        text: string,
        params: unknown[] = [],
      ): Promise<R[]> => (await client.query(text, params)).rows as R[];
      const result = await fn(txSql);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  await sql("begin");
  try {
    const result = await fn(sql);
    await sql("commit");
    return result;
  } catch (error) {
    await sql("rollback");
    throw error;
  }
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir(migrationsDir()).catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const body = await readFile(path.join(migrationsDir(), file), "utf8");
    await db.exec(body);
  }
  return db;
}

/** Reset in-memory DB (tests only). */
export async function resetLocalDbForTests(): Promise<void> {
  if (databaseUrl !== "") {
    throw new Error("resetLocalDbForTests solo con PGlite");
  }
  local = undefined;
  await sql("select 1");
}
