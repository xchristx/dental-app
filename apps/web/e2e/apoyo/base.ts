// Acceso directo a la base local para preparar cada prueba.
// Solo funciona contra el Supabase local: nunca contra la demo ni producción.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const URL_BASE = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const host = new URL(URL_BASE).hostname
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(
    `Las pruebas de punta a punta solo corren contra el Supabase local, no contra ${host}.`,
  )
}

const SEED = readFileSync(join(__dirname, '../../../../supabase/seed.sql'), 'utf8')

/** Ids fijos del seed. */
export const ID = {
  organizacion: '10000000-0000-4000-8000-000000000001',
  laura: '20000000-0000-4000-8000-000000000001',
  rocio: '20000000-0000-4000-8000-000000000002',
  consultorio: '30000000-0000-4000-8000-000000000001',
  clinica: '30000000-0000-4000-8000-000000000002',
  consultorioRocio: '30000000-0000-4000-8000-000000000003',
  control: '40000000-0000-4000-8000-000000000001',
  lucia: '50000000-0000-4000-8000-000000000003',
  jorge: '50000000-0000-4000-8000-000000000004',
  sofia: '50000000-0000-4000-8000-000000000006',
  andres: '50000000-0000-4000-8000-000000000008',
  gabriel: '50000000-0000-4000-8000-000000000009',
  /** Citas del seed, una por fila de supabase/seed.sql. */
  cita: {
    jorgeMartes: '60000000-0000-4000-8000-000000000004',
    andresJueves: '60000000-0000-4000-8000-000000000009',
    gabrielViernes: '60000000-0000-4000-8000-000000000011',
    paolaViernes: '60000000-0000-4000-8000-000000000012',
  },
} as const

export async function sql(texto: string, parametros: unknown[] = []) {
  const cliente = new pg.Client({ connectionString: URL_BASE })
  await cliente.connect()
  try {
    return await cliente.query(texto, parametros)
  } finally {
    await cliente.end()
  }
}

/**
 * Deja la base como recién reiniciada: vacía las tablas y vuelve a cargar el
 * seed, que ubica las citas en la semana actual. Es mucho más rápido que
 * `supabase db reset` y no toca las migraciones.
 */
export async function reiniciarBase() {
  const { rows } = await sql(
    `select string_agg(format('%I.%I', schemaname, tablename), ', ') as tablas
     from pg_tables where schemaname = 'public'`,
  )
  await sql(`truncate ${rows[0].tablas} cascade; delete from auth.users;`)
  await sql(SEED)
}

/**
 * Mueve citas del seed `dias` días (por ejemplo, -7 para que toda la semana
 * ya haya pasado). Sin `ids`, mueve todas.
 */
export async function moverCitas(dias: number, ids?: string[]) {
  await sql(
    `update citas
       set inicio = inicio + make_interval(days => $1),
           fin = fin + make_interval(days => $1),
           llegada_at = llegada_at + make_interval(days => $1)
     where $2::uuid[] is null or id = any($2::uuid[])`,
    [dias, ids ?? null],
  )
}
