/**
 * Postgres SQLSTATE 23505 is the unique constraint violation code.
 */
const UNIQUE_VIOLATION = "23505"

/**
 * Postgres SQLSTATE 23503 is the foreign key constraint violation code.
 */
const FOREIGN_KEY_VIOLATION = "23503"

/**
 * `drizzle-orm` 1.0.0-rc.4 wraps every driver failure in a `DrizzleQueryError`: the wrapper
 * has no `code` of its own and keeps the real pg `DatabaseError` — which carries the SQLSTATE
 * `code` (`23505` unique, `23503` foreign key) — in `.cause`. Reading only the top level never
 * matches a real constraint violation, so unique/FK errors escaped the `ConflictError` mapping
 * and reached the client as HTTP 500 instead of 409. Walk the `cause` chain (bounded, so a
 * cyclic or pathological chain cannot hang) to find the SQLSTATE in either shape.
 */
const MAX_CAUSE_DEPTH = 5

function hasSqlState(error: unknown, sqlState: string): boolean {
  let current: unknown = error

  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== "object" || current === null) {
      return false
    }

    // Compare as a string explicitly: non-string codes must not match.
    const { code } = current as { code?: unknown }
    if (typeof code === "string" && code === sqlState) {
      return true
    }

    current = (current as { cause?: unknown }).cause
  }

  return false
}

export function isUniqueViolation(error: unknown): boolean {
  return hasSqlState(error, UNIQUE_VIOLATION)
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasSqlState(error, FOREIGN_KEY_VIOLATION)
}
