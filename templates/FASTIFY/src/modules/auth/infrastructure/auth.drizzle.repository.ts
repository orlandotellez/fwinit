import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { role, session, user } from "@/db/schema"
import type { IAuthRepository } from "../domain/auth.interface"
import type { ISessionEntity, IUserWithRole } from "../domain/auth.entities"

const userSelect = {
  id: user.id,
  name: user.name,
  email: user.email,
  password_hash: user.passwordHash,
  role: { id: role.id, name: role.name },
  is_active: user.isActive,
  created_at: user.createdAt,
  updated_at: user.updatedAt,
  deleted_at: user.deletedAt,
}

type SessionRow = typeof session.$inferSelect

function mapSessionToEntity(row: SessionRow): ISessionEntity {
  return {
    id: row.id,
    user_id: row.userId,
    refresh_token: row.refreshToken,
    expires_at: row.expiresAt,
    created_at: row.createdAt,
  }
}

export const AuthRepository: IAuthRepository = {
  async findUserByEmail(email) {
    const [row] = await db
      .select(userSelect)
      .from(user)
      .innerJoin(role, eq(user.roleId, role.id))
      .where(eq(user.email, email))
      .limit(1)
    return row ?? null
  },

  async findUserById(id) {
    const [row] = await db
      .select(userSelect)
      .from(user)
      .innerJoin(role, eq(user.roleId, role.id))
      .where(eq(user.id, id))
      .limit(1)
    return row ?? null
  },

  async createSession(userId, refreshToken, expiresAt) {
    const [row] = await db
      .insert(session)
      .values({ id: randomUUID(), userId, refreshToken, expiresAt })
      .returning()
    return mapSessionToEntity(row)
  },

  async findSessionByToken(refreshToken) {
    const [row] = await db.select().from(session).where(eq(session.refreshToken, refreshToken)).limit(1)
    return row ? mapSessionToEntity(row) : null
  },

  async deleteSession(refreshToken) {
    await db.delete(session).where(eq(session.refreshToken, refreshToken))
  },
}
