import { randomUUID } from "node:crypto"
import { and, asc, count, eq, ilike, isNull } from "drizzle-orm"
import { db } from "@/db"
import { role } from "@/db/schema"
import { ConflictError, NotFoundError } from "@/core/errors/AppError"
import { isForeignKeyViolation, isUniqueViolation } from "@/core/errors/db-errors"
import type { IRoleRepository } from "../domain/roles.interface"
import type { CreateRoleData, IRoleEntity, UpdateRoleData } from "../domain/roles.entities"

type RoleRow = typeof role.$inferSelect

function mapToEntity(row: RoleRow): IRoleEntity {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }
}

export const RoleRepository: IRoleRepository = {
  async findAll(params) {
    const conditions = [isNull(role.deletedAt)]
    if (params?.search) {
      conditions.push(ilike(role.name, `%${params.search}%`))
    }

    const page = params?.page || 1
    const limit = params?.limit || 50

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(role)
        .where(and(...conditions))
        .orderBy(asc(role.name))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(role).where(and(...conditions)),
    ])

    return { roles: rows.map(mapToEntity), total: totalRows[0]?.total ?? 0, page, limit }
  },

  async findById(id) {
    const [row] = await db
      .select()
      .from(role)
      .where(and(eq(role.id, id), isNull(role.deletedAt)))
      .limit(1)
    return row ? mapToEntity(row) : null
  },

  async findByName(name) {
    const [row] = await db
      .select()
      .from(role)
      .where(and(eq(role.name, name), isNull(role.deletedAt)))
      .limit(1)
    return row ? mapToEntity(row) : null
  },

  async create(data) {
    try {
      const [row] = await db
        .insert(role)
        .values({ id: randomUUID(), name: data.name, description: data.description ?? null })
        .returning()
      return mapToEntity(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Role name already exists")
      }
      throw error
    }
  },

  async update(id, data) {
    try {
      const [row] = await db
        .update(role)
        .set({
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        })
        .where(eq(role.id, id))
        .returning()
      if (!row) throw new NotFoundError("Role not found")
      return mapToEntity(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Role name already exists")
      }
      throw error
    }
  },

  async softDelete(id) {
    try {
      await db.update(role).set({ deletedAt: new Date() }).where(eq(role.id, id))
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictError("Cannot delete a role assigned to users")
      }
      throw error
    }
  },
}
