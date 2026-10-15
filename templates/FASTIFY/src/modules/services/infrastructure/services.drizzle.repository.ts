import { randomUUID } from "node:crypto"
import { and, asc, count, eq, ilike, isNull } from "drizzle-orm"
import { db } from "@/db"
import { service } from "@/db/schema"
import { NotFoundError } from "@/core/errors/AppError"
import type { IServiceRepository } from "../domain/services.interface"
import type { CreateServiceData, IServiceEntity, UpdateServiceData } from "../domain/services.entities"

type ServiceRow = typeof service.$inferSelect

function mapToEntity(row: ServiceRow): IServiceEntity {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    base_price: Number(row.basePrice),
    is_active: row.isActive,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }
}

export const ServiceRepository: IServiceRepository = {
  async findAll(params) {
    const conditions = [isNull(service.deletedAt)]
    if (params?.search) {
      conditions.push(ilike(service.name, `%${params.search}%`))
    }
    if (params?.active !== undefined) {
      conditions.push(eq(service.isActive, params.active))
    }

    const page = params?.page || 1
    const limit = params?.limit || 50

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(service)
        .where(and(...conditions))
        .orderBy(asc(service.name))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(service).where(and(...conditions)),
    ])

    return { services: rows.map(mapToEntity), total: totalRows[0]?.total ?? 0, page, limit }
  },

  async findById(id) {
    const [row] = await db
      .select()
      .from(service)
      .where(and(eq(service.id, id), isNull(service.deletedAt)))
      .limit(1)
    return row ? mapToEntity(row) : null
  },

  async create(data: CreateServiceData) {
    const [row] = await db
      .insert(service)
      .values({
        id: randomUUID(),
        name: data.name,
        description: data.description ?? null,
        basePrice: data.base_price.toString(),
        ...(data.is_active !== undefined && { isActive: data.is_active }),
      })
      .returning()
    return mapToEntity(row)
  },

  async update(id, data: UpdateServiceData) {
    const [row] = await db
      .update(service)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.base_price !== undefined && { basePrice: data.base_price.toString() }),
        ...(data.is_active !== undefined && { isActive: data.is_active }),
      })
      .where(eq(service.id, id))
      .returning()
    if (!row) throw new NotFoundError("Service not found")
    return mapToEntity(row)
  },

  async softDelete(id) {
    await db.update(service).set({ deletedAt: new Date() }).where(eq(service.id, id))
  },
}
