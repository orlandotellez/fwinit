import { test } from "bun:test"
import assert from "node:assert/strict"
import { NotFoundError } from "@/core/errors/AppError"
import { createServiceService } from "../../application/services.service"
import type { CreateServiceData, IServiceEntity, UpdateServiceData } from "../../domain/services.entities"

function makeService(overrides: Partial<IServiceEntity> = {}): IServiceEntity {
  return {
    id: "s1",
    name: "Corte de cabello",
    description: null,
    base_price: 10,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  }
}

const makeFakeServiceRepository = (overrides: Record<string, unknown> = {}) => ({
  findAll: async () => ({ services: [makeService()], total: 1, page: 1, limit: 50 }),
  findById: async () => null,
  create: async (data: CreateServiceData) => makeService({ ...data, id: "s9" } as unknown as IServiceEntity),
  update: async (id: string, data: UpdateServiceData) => makeService({ id, ...data } as unknown as IServiceEntity),
  softDelete: async () => {},
  ...overrides,
})

test("list exposes base_price as a number", async () => {
  const service = createServiceService(makeFakeServiceRepository())
  const result = await service.list()

  assert.equal(result.total, 1)
  assert.equal(result.services[0]?.base_price, 10)
})

test("getById throws NotFoundError when service does not exist", async () => {
  const service = createServiceService(makeFakeServiceRepository())
  await assert.rejects(() => service.getById("missing"), NotFoundError)
})

test("create maps the created service to response", async () => {
  const service = createServiceService(makeFakeServiceRepository())
  const result = await service.create({ name: "Manicura", base_price: 15 })

  assert.equal(result.id, "s9")
  assert.equal(result.name, "Manicura")
})

test("delete throws NotFoundError when service does not exist", async () => {
  const service = createServiceService(makeFakeServiceRepository())
  await assert.rejects(() => service.delete("missing"), NotFoundError)
})