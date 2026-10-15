import { randomUUID } from "node:crypto"
import { and, asc, count, desc, eq, isNull, lte } from "drizzle-orm"
import { db } from "@/db"
import { inventoryMovement, product, user } from "@/db/schema"
import { NotFoundError } from "@/core/errors/AppError"
import type { IInventoryRepository } from "../domain/inventory.interface"
import type { CreateMovementData, IInventoryMovementEntity, MovementType } from "../domain/inventory.entities"

const movementSelect = {
  id: inventoryMovement.id,
  product_id: inventoryMovement.productId,
  product: { id: product.id, name: product.name, barcode: product.barcode },
  user_id: inventoryMovement.userId,
  user: { id: user.id, name: user.name, email: user.email },
  type: inventoryMovement.type,
  quantity: inventoryMovement.quantity,
  unit_cost: inventoryMovement.unitCost,
  note: inventoryMovement.note,
  created_at: inventoryMovement.createdAt,
}

type MovementRow = {
  id: string
  product_id: string
  product: { id: string; name: string; barcode: string | null }
  user_id: string
  user: { id: string; name: string; email: string }
  type: string
  quantity: number
  unit_cost: string | null
  note: string | null
  created_at: Date
}

function mapToEntity(row: MovementRow): IInventoryMovementEntity {
  return {
    ...row,
    type: row.type as MovementType,
    unit_cost: row.unit_cost === null ? null : Number(row.unit_cost),
    note: row.note ?? null,
  }
}

export const InventoryRepository: IInventoryRepository = {
  async findProductById(id) {
    const [row] = await db
      .select({ id: product.id, stock: product.stock, active: product.active, deleted_at: product.deletedAt })
      .from(product)
      .where(eq(product.id, id))
      .limit(1)
    return row ?? null
  },

  async listMovements(params) {
    const conditions = []
    if (params?.product_id) {
      conditions.push(eq(inventoryMovement.productId, params.product_id))
    }
    if (params?.type) {
      conditions.push(eq(inventoryMovement.type, params.type))
    }

    const page = params?.page || 1
    const limit = params?.limit || 50

    const [rows, totalRows] = await Promise.all([
      db
        .select(movementSelect)
        .from(inventoryMovement)
        .innerJoin(product, eq(inventoryMovement.productId, product.id))
        .innerJoin(user, eq(inventoryMovement.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(inventoryMovement.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(inventoryMovement).where(and(...conditions)),
    ])

    return { movements: rows.map(mapToEntity), total: totalRows[0]?.total ?? 0, page, limit }
  },

  async createMovement(data: CreateMovementData, userId, newStock) {
    const movement = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(inventoryMovement)
        .values({
          id: randomUUID(),
          productId: data.product_id,
          userId,
          type: data.type,
          quantity: data.quantity,
          unitCost: data.unit_cost === undefined ? null : data.unit_cost.toString(),
          note: data.note ?? null,
        })
        .returning({ id: inventoryMovement.id })

      await tx.update(product).set({ stock: newStock }).where(eq(product.id, data.product_id))

      const [row] = await tx
        .select(movementSelect)
        .from(inventoryMovement)
        .innerJoin(product, eq(inventoryMovement.productId, product.id))
        .innerJoin(user, eq(inventoryMovement.userId, user.id))
        .where(eq(inventoryMovement.id, inserted.id))
        .limit(1)
      return row ? mapToEntity(row) : null
    })

    if (!movement) throw new NotFoundError("Inventory movement not found")
    return movement
  },

  async findLowStockProducts() {
    return db
      .select({
        id: product.id,
        name: product.name,
        stock: product.stock,
        low_stock_threshold: product.lowStockThreshold,
      })
      .from(product)
      .where(and(isNull(product.deletedAt), eq(product.active, true), lte(product.stock, product.lowStockThreshold)))
      .orderBy(asc(product.stock))
  },
}
