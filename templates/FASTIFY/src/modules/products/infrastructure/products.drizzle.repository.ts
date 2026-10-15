import { randomUUID } from "node:crypto"
import { and, asc, count, eq, ilike, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import { product } from "@/db/schema"
import { ConflictError, NotFoundError } from "@/core/errors/AppError"
import { isUniqueViolation } from "@/core/errors/db-errors"
import type { IProductRepository } from "../domain/products.interface"
import type { CreateProductData, IProductEntity, UpdateProductData } from "../domain/products.entities"

type ProductRow = typeof product.$inferSelect

function mapToEntity(row: ProductRow): IProductEntity {
  return {
    id: row.id,
    barcode: row.barcode ?? null,
    name: row.name,
    price: Number(row.price),
    cost: row.cost === null ? null : Number(row.cost),
    stock: row.stock,
    low_stock_threshold: row.lowStockThreshold,
    active: row.active,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }
}

export const ProductRepository: IProductRepository = {
  async findAll(params) {
    const conditions = [isNull(product.deletedAt)]
    if (params?.search) {
      conditions.push(or(ilike(product.name, `%${params.search}%`), ilike(product.barcode, `%${params.search}%`))!)
    }
    if (params?.active !== undefined) {
      conditions.push(eq(product.active, params.active))
    }

    const page = params?.page || 1
    const limit = params?.limit || 50

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(product)
        .where(and(...conditions))
        .orderBy(asc(product.name))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(product).where(and(...conditions)),
    ])

    return { products: rows.map(mapToEntity), total: totalRows[0]?.total ?? 0, page, limit }
  },

  async findById(id) {
    const [row] = await db
      .select()
      .from(product)
      .where(and(eq(product.id, id), isNull(product.deletedAt)))
      .limit(1)
    return row ? mapToEntity(row) : null
  },

  async create(data: CreateProductData) {
    try {
      const [row] = await db
        .insert(product)
        .values({
          id: randomUUID(),
          barcode: data.barcode ?? null,
          name: data.name,
          price: data.price.toString(),
          cost: data.cost === null || data.cost === undefined ? null : data.cost.toString(),
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.low_stock_threshold !== undefined && { lowStockThreshold: data.low_stock_threshold }),
          ...(data.active !== undefined && { active: data.active }),
        })
        .returning()
      return mapToEntity(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Barcode already exists")
      }
      throw error
    }
  },

  async update(id, data: UpdateProductData) {
    try {
      const [row] = await db
        .update(product)
        .set({
          ...(data.barcode !== undefined && { barcode: data.barcode }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.price !== undefined && { price: data.price.toString() }),
          ...(data.cost !== undefined && { cost: data.cost === null ? null : data.cost.toString() }),
          ...(data.low_stock_threshold !== undefined && { lowStockThreshold: data.low_stock_threshold }),
          ...(data.active !== undefined && { active: data.active }),
        })
        .where(eq(product.id, id))
        .returning()
      if (!row) throw new NotFoundError("Product not found")
      return mapToEntity(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Barcode already exists")
      }
      throw error
    }
  },

  async softDelete(id) {
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.id, id))
  },
}
