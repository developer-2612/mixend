import pg from 'pg';

const { Pool } = pg;

let pool;

const formatQuery = (text, params = []) => {
  if (!params.length) return text;
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
};

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function getConnection() {
  const client = await getPool().connect();
  const query = async (text, params = []) => {
    const sql = formatQuery(text, params);
    const result = await client.query(sql, params);
    return [result.rows, result];
  };
  return {
    query,
    execute: query,
    release: () => client.release(),
  };
}
