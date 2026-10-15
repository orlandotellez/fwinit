import { test } from "bun:test"
import assert from "node:assert/strict"
import { ConflictError, NotFoundError } from "@/core/errors/AppError"
import { makeUniqueViolation } from "@/tests/fakes"
import { createRoleService } from "../../application/roles.service"
import type { IRoleEntity } from "../../domain/roles.entities"

function makeRole(overrides: Partial<IRoleEntity> = {}): IRoleEntity {
  return {
    id: "r1",
    name: "admin",
    description: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  }
}

const makeFakeRoleRepository = (overrides: Record<string, unknown> = {}) => ({
  findAll: async () => ({ roles: [makeRole()], total: 1, page: 1, limit: 50 }),
  findById: async () => null,
  findByName: async () => null,
  create: async (data: { name: string; description?: string | null }) => makeRole({ name: data.name, description: data.description ?? null }),
  update: async (id: string, data: { name?: string; description?: string | null }) => makeRole({ id, ...data }),
  softDelete: async () => {},
  ...overrides,
})

test("list returns roles mapped to response", async () => {
  const service = createRoleService(makeFakeRoleRepository())
  const result = await service.list()

  assert.equal(result.total, 1)
  assert.equal(result.roles[0]?.name, "admin")
  assert.equal("deleted_at" in result.roles[0]!, false)
})

test("getById throws NotFoundError when role does not exist", async () => {
  const service = createRoleService(makeFakeRoleRepository())
  await assert.rejects(() => service.getById("missing"), NotFoundError)
})

test("create throws ConflictError when the name already exists", async () => {
  const service = createRoleService(
    makeFakeRoleRepository({
      findByName: async () => makeRole({ name: "admin" }),
    }),
  )
  await assert.rejects(() => service.create({ name: "admin" }), ConflictError)
})

test("create maps the created role to response", async () => {
  const repository = makeFakeRoleRepository({
    create: async (data: { name: string; description?: string | null }) => makeRole({ id: "r9", name: data.name, description: data.description ?? null }),
  })
  const service = createRoleService(repository)

  const result = await service.create({ name: "cajero", description: "Cashier" })

  assert.equal(result.id, "r9")
  assert.equal(result.name, "cajero")
  assert.equal(result.description, "Cashier")
})

test("update throws NotFoundError when role does not exist", async () => {
  const service = createRoleService(
    makeFakeRoleRepository({
      update: async () => {
        throw makeUniqueViolation("role_name_key")
      },
    }),
  )
  await assert.rejects(() => service.update("missing", { name: "x" }), NotFoundError)
})

test("delete throws NotFoundError when role does not exist", async () => {
  const service = createRoleService(makeFakeRoleRepository())
  await assert.rejects(() => service.delete("missing"), NotFoundError)
})