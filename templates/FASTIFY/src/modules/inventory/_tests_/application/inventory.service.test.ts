import { test } from "bun:test"
import assert from "node:assert/strict"
import { ConflictError, NotFoundError } from "@/core/errors/AppError"
import { createInventoryService } from "../../application/inventory.service"
import type { IInventoryMovementEntity } from "../../domain/inventory.entities"

function makeMovement(overrides: Partial<IInventoryMovementEntity> = {}): IInventoryMovementEntity {
  return {
    id: "m1",
    product_id: "p1",
    product: { id: "p1", name: "Coca-Cola 500ml", barcode: "7790000000011" },
    user_id: "u1",
    user: { id: "u1", name: "Admin", email: "admin@example.com" },
    type: "entrada",
    quantity: 10,
    unit_cost: null,
    note: null,
    created_at: new Date(),
    ...overrides,
  }
}

const makeFakeInventoryRepository = (overrides: Record<string, unknown> = {}) => ({
  findProductById: async () => ({ id: "p1", stock: 50, active: true, deleted_at: null }),
  listMovements: async () => ({ movements: [makeMovement()], total: 1, page: 1, limit: 50 }),
  createMovement: async (_data: unknown, _userId: string, newStock: number) => makeMovement({ id: "m9" }),
  findLowStockProducts: async () => [],
  ...overrides,
})

test("createMovement with entrada adds to the stock", async () => {
  let newStock = -1
  const repository = makeFakeInventoryRepository({
    createMovement: async (_data: unknown, _userId: string, stock: number) => {
      newStock = stock
      return makeMovement()
    },
  })
  const service = createInventoryService(repository)

  const result = await service.createMovement({ product_id: "p1", type: "entrada", quantity: 10 }, "u1")

  assert.equal(newStock, 60)
  assert.equal(result.id, "m1")
})

test("createMovement with salida subtracts from the stock", async () => {
  let newStock = -1
  const repository = makeFakeInventoryRepository({
    createMovement: async (_data: unknown, _userId: string, stock: number) => {
      newStock = stock
      return makeMovement({ type: "salida" })
    },
  })
  const service = createInventoryService(repository)

  await service.createMovement({ product_id: "p1", type: "salida", quantity: 10 }, "u1")

  assert.equal(newStock, 40)
})

test("createMovement with salida throws ConflictError when stock is insufficient", async () => {
  const repository = makeFakeInventoryRepository({
    findProductById: async () => ({ id: "p1", stock: 5, active: true, deleted_at: null }),
  })
  const service = createInventoryService(repository)

  await assert.rejects(
    () => service.createMovement({ product_id: "p1", type: "salida", quantity: 10 }, "u1"),
    ConflictError,
  )
})

test("createMovement with ajuste sets the stock to the quantity", async () => {
  let newStock = -1
  const repository = makeFakeInventoryRepository({
    createMovement: async (_data: unknown, _userId: string, stock: number) => {
      newStock = stock
      return makeMovement({ type: "ajuste" })
    },
  })
  const service = createInventoryService(repository)

  await service.createMovement({ product_id: "p1", type: "ajuste", quantity: 7 }, "u1")

  assert.equal(newStock, 7)
})

test("createMovement throws NotFoundError when product does not exist", async () => {
  const repository = makeFakeInventoryRepository({
    findProductById: async () => null,
  })
  const service = createInventoryService(repository)

  await assert.rejects(
    () => service.createMovement({ product_id: "p9", type: "entrada", quantity: 1 }, "u1"),
    NotFoundError,
  )
})

test("lowStock returns the products under their threshold", async () => {
  const lowStockProducts = [
    { id: "p3", name: "Agua 600ml", stock: 3, low_stock_threshold: 5 },
  ]
  const repository = makeFakeInventoryRepository({
    findLowStockProducts: async () => lowStockProducts,
  })
  const service = createInventoryService(repository)

  const result = await service.lowStock()

  assert.equal(result.length, 1)
  assert.equal(result[0]?.stock, 3)
})