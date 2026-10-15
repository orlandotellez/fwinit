import { expect, test } from "bun:test"
import { isForeignKeyViolation, isUniqueViolation } from "@/core/errors/db-errors"
import { makeForeignKeyViolation, makeUniqueViolation } from "@/tests/fakes"

/** pg `DatabaseError`-shaped error: carries the SQLSTATE in its own `code`. */
function driverError(code: unknown, constraint?: string): Error {
  return Object.assign(new Error(`driver error ${String(code)}`), { code, constraint })
}

/** `DrizzleQueryError`-shaped wrapper: no own `code`, driver error in `.cause`. */
function drizzleQueryError(cause: unknown): Error {
  const query = 'insert into "example" ("id") values ($1)'
  return Object.assign(new Error(`Failed query: ${query}\nparams: $1`), {
    query,
    params: ["00000000-0000-0000-0000-000000000000"],
    cause,
  })
}

test("wrapped unique violation (SQLSTATE in cause) is recognised as unique, not FK", () => {
  const error = drizzleQueryError(driverError("23505", "product_barcode_key"))

  expect(Object.hasOwn(error, "code")).toBe(false)
  expect(isUniqueViolation(error)).toBe(true)
  expect(isForeignKeyViolation(error)).toBe(false)
})

test("wrapped foreign key violation (SQLSTATE in cause) is recognised as FK, not unique", () => {
  const error = drizzleQueryError(driverError("23503", "user_role_id_role_id_fk"))

  expect(isForeignKeyViolation(error)).toBe(true)
  expect(isUniqueViolation(error)).toBe(false)
})

test("bare driver error (SQLSTATE at the top level, no wrapper) is recognised", () => {
  const unique = driverError("23505", "role_name_key")
  const foreignKey = driverError("23503", "role_id_fkey")

  expect(isUniqueViolation(unique)).toBe(true)
  expect(isForeignKeyViolation(unique)).toBe(false)
  expect(isForeignKeyViolation(foreignKey)).toBe(true)
  expect(isUniqueViolation(foreignKey)).toBe(false)
})

test("a deeper cause chain is walked and terminates", () => {
  const error = new Error("outer", { cause: drizzleQueryError(driverError("23505", "product_barcode_key")) })

  expect(isUniqueViolation(error)).toBe(true)
  expect(isForeignKeyViolation(error)).toBe(false)
})

test("a cyclic cause chain terminates and does not match", () => {
  const a = new Error("a")
  const b = new Error("b", { cause: a })
  ;(a as Error & { cause?: unknown }).cause = b

  expect(isUniqueViolation(a)).toBe(false)
  expect(isForeignKeyViolation(a)).toBe(false)
})

test("the shared fakes reproduce a shape the predicates recognise", () => {
  expect(isUniqueViolation(makeUniqueViolation("product_barcode_key"))).toBe(true)
  expect(isForeignKeyViolation(makeUniqueViolation("product_barcode_key"))).toBe(false)
  expect(isForeignKeyViolation(makeForeignKeyViolation("user_role_id_role_id_fk"))).toBe(true)
  expect(isUniqueViolation(makeForeignKeyViolation("user_role_id_role_id_fk"))).toBe(false)
})

test("a matching code inside a non-error cause is still found (code may not be an Error)", () => {
  const error = drizzleQueryError({ code: "23505" })

  expect(isUniqueViolation(error)).toBe(true)
})

test("non-matching and non-string codes are ignored", () => {
  expect(isUniqueViolation(driverError("23502"))).toBe(false)
  expect(isForeignKeyViolation(driverError("23502"))).toBe(false)
  expect(isUniqueViolation(driverError(23505))).toBe(false)
  expect(isForeignKeyViolation(driverError(23503))).toBe(false)
  expect(isUniqueViolation(drizzleQueryError({ code: 23505 }))).toBe(false)
})

test("plain Error without a code, null, undefined, string and number return false without throwing", () => {
  const inputs: unknown[] = [new Error("plain"), null, undefined, "23505", 23505, { cause: null }]

  for (const input of inputs) {
    expect(isUniqueViolation(input)).toBe(false)
    expect(isForeignKeyViolation(input)).toBe(false)
  }
})
