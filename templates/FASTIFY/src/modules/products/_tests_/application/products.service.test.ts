import { test } from "bun:test"
import assert from "node:assert/strict"
import { ConflictError, NotFoundError } from "@/core/errors/AppError"
import { makeUniqueViolation } from "@/tests/fakes"
import { createProductService } from "../../application/products.service"
import type { CreateProductData, IProductEntity, UpdateProductData } from "../../domain/products.entities"

function makeProduct(overrides: Partial<IProductEntity> = {}): IProductEntity {
  return {
    id: "p1",
    barcode: "7790000000011",
    name: "Coca-Cola 500ml",
    price: 1.5,
    cost: 1.1,
    stock: 50,
    low_stock_threshold: 5,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  }
}

const makeFakeProductRepository = (overrides: Record<string, unknown> = {}) => ({
  findAll: async () => ({ products: [makeProduct()], total: 1, page: 1, limit: 50 }),
  findById: async () => null,
  create: async (data: CreateProductData) => makeProduct({ ...data, id: "p9" } as unknown as IProductEntity),
  update: async (id: string, data: UpdateProductData) => makeProduct({ id, ...data } as unknown as IProductEntity),
  softDelete: async () => {},
  ...overrides,
})

test("list exposes prices as numbers", async () => {
  const service = createProductService(makeFakeProductRepository())
  const result = await service.list()

  assert.equal(result.total, 1)
  assert.equal(result.products[0]?.price, 1.5)
  assert.equal(result.products[0]?.cost, 1.1)
})

test("getById throws NotFoundError when product does not exist", async () => {
  const service = createProductService(makeFakeProductRepository())
  await assert.rejects(() => service.getById("missing"), NotFoundError)
})

test("create maps the created product to response", async () => {
  const service = createProductService(makeFakeProductRepository())
  const result = await service.create({ name: "Agua 600ml", price: 0.8 })

  assert.equal(result.id, "p9")
  assert.equal(result.name, "Agua 600ml")
})

test("create propagates ConflictError when the barcode already exists", async () => {
  const repository = makeFakeProductRepository({
    create: async () => {
      throw makeUniqueViolation("product_barcode_key")
    },
  })
  const service = createProductService(repository)

  await assert.rejects(
    () => service.create({ name: "Duplicated", price: 1 }),
    ConflictError,
  )
})

test("update throws NotFoundError when product does not exist", async () => {
  const service = createProductService(
    makeFakeProductRepository({
      update: async () => makeProduct(),
    }),
  )
  await assert.rejects(() => service.update("missing", { price: 2 }), NotFoundError)
})

test("delete throws NotFoundError when product does not exist", async () => {
  const service = createProductService(makeFakeProductRepository())
  await assert.rejects(() => service.delete("missing"), NotFoundError)
})