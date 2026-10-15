import { randomUUID } from "node:crypto"
import { and, asc, count, eq, ilike, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import { role, user } from "@/db/schema"
import { ConflictError, NotFoundError } from "@/core/errors/AppError"
import { isForeignKeyViolation, isUniqueViolation } from "@/core/errors/db-errors"
import type { IUserRepository } from "../domain/users.interface"
import type { CreateUserData, IUserEntity, UpdateUserData } from "../domain/users.entities"

const userSelect = {
  id: user.id,
  name: user.name,
  email: user.email,
  password_hash: user.passwordHash,
  role_id: user.roleId,
  role: { id: role.id, name: role.name },
  is_active: user.isActive,
  created_at: user.createdAt,
  updated_at: user.updatedAt,
  deleted_at: user.deletedAt,
}

function mapToEntity(row: IUserEntity): IUserEntity {
  return {
    ...row,
    is_active: row.is_active ?? true,
    deleted_at: row.deleted_at ?? null,
  }
}

export const UserRepository: IUserRepository = {
  async findAll(params) {
    const conditions = [isNull(user.deletedAt)]
    if (params?.search) {
      conditions.push(or(ilike(user.name, `%${params.search}%`), ilike(user.email, `%${params.search}%`))!)
    }

    const page = params?.page || 1
    const limit = params?.limit || 50

    const [rows, totalRows] = await Promise.all([
      db
        .select(userSelect)
        .from(user)
        .innerJoin(role, eq(user.roleId, role.id))
        .where(and(...conditions))
        .orderBy(asc(user.name))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(user).where(and(...conditions)),
    ])

    return { users: rows.map(mapToEntity), total: totalRows[0]?.total ?? 0, page, limit }
  },

  async findById(id) {
    const [row] = await db
      .select(userSelect)
      .from(user)
      .innerJoin(role, eq(user.roleId, role.id))
      .where(and(eq(user.id, id), isNull(user.deletedAt)))
      .limit(1)
    return row ? mapToEntity(row) : null
  },

  async findByEmail(email) {
    const [row] = await db
      .select(userSelect)
      .from(user)
      .innerJoin(role, eq(user.roleId, role.id))
      .where(and(eq(user.email, email), isNull(user.deletedAt)))
      .limit(1)
    return row ? mapToEntity(row) : null
  },

  async create(data: CreateUserData) {
    try {
      const [inserted] = await db
        .insert(user)
        .values({
          id: randomUUID(),
          name: data.name,
          email: data.email,
          passwordHash: data.password_hash,
          roleId: data.role_id,
        })
        .returning({ id: user.id })
      const [row] = await db
        .select(userSelect)
        .from(user)
        .innerJoin(role, eq(user.roleId, role.id))
        .where(eq(user.id, inserted.id))
        .limit(1)
      if (!row) throw new NotFoundError("User not found")
      return mapToEntity(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Email already registered")
      }
      if (isForeignKeyViolation(error)) {
        throw new ConflictError("Role does not exist")
      }
      throw error
    }
  },

  async update(id, data: UpdateUserData) {
    const [updated] = await db
      .update(user)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.role_id !== undefined && { roleId: data.role_id }),
        ...(data.is_active !== undefined && { isActive: data.is_active }),
      })
      .where(eq(user.id, id))
      .returning({ id: user.id })
    if (!updated) throw new NotFoundError("User not found")

    const [row] = await db
      .select(userSelect)
      .from(user)
      .innerJoin(role, eq(user.roleId, role.id))
      .where(eq(user.id, updated.id))
      .limit(1)
    if (!row) throw new NotFoundError("User not found")
    return mapToEntity(row)
  },

  async softDelete(id) {
    await db.update(user).set({ deletedAt: new Date() }).where(eq(user.id, id))
  },
}
