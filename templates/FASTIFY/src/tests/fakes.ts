/**
 * These fakes reproduce the REAL shape `drizzle-orm` 1.0.0-rc.4 produces on a constraint
 * violation: the driver's error (the pg `DatabaseError` that carries the SQLSTATE `code`
 * — `23505` unique / `23503` foreign key — and the `constraint` name) is wrapped in a
 * `DrizzleQueryError` with message `Failed query: ...`, `query`/`params` and **no `code`
 * of its own**; the SQLSTATE lives in `.cause`.
 *
 * Do NOT flatten these back into a bare `{ code: "23505" }`: that shape never reaches the
 * app, and faking it hides the fact that the mapping helpers must walk the `cause` chain
 * (see `odd/tasks/fastify-drizzle-migration.md`, "Discovered defect (blocking, fixed in D1)").
 */
function makeDriverError(code: string, message: string, constraint?: string): Error {
  return Object.assign(new Error(message), { code, constraint })
}

function makeDrizzleQueryError(code: string, driverMessage: string, constraint?: string): Error {
  const query = 'insert into "example" ("id") values ($1)'
  return Object.assign(new Error(`Failed query: ${query}\nparams: $1`), {
    query,
    params: ["00000000-0000-0000-0000-000000000000"],
    cause: makeDriverError(code, driverMessage, constraint),
  })
}

export function makeUniqueViolation(constraint?: string) {
  return makeDrizzleQueryError(
    "23505",
    `duplicate key value violates unique constraint "${constraint ?? "unknown"}"`,
    constraint,
  )
}

export function makeForeignKeyViolation(constraint?: string) {
  return makeDrizzleQueryError(
    "23503",
    `insert or update on table "example" violates foreign key constraint "${constraint ?? "unknown"}"`,
    constraint,
  )
}
