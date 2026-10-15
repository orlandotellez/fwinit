import type { FastifyReply, FastifyRequest } from "fastify"
import { createAuthService } from "../application/auth.service"
import { AuthRepository } from "../infrastructure/auth.drizzle.repository"
import { LoginDtoSchema, RefreshTokenDtoSchema } from "./auth.dto"
import { clearAuthCookies, setAuthCookies } from "../application/common/cookie.utils"

const authService = createAuthService(AuthRepository)

export const authController = {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const body = LoginDtoSchema.parse(request.body)
    const result = await authService.login(body.email, body.password)
    setAuthCookies(reply, result.accessToken, result.refreshToken)
    return reply.status(200).send({ user: result.user })
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const body = RefreshTokenDtoSchema.parse(request.body)
    const result = await authService.refresh(body.refresh_token)
    return reply.status(200).send(result)
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies.refresh_token
    await authService.logout(refreshToken)
    clearAuthCookies(reply)
    return reply.status(200).send({ message: "Logged out successfully" })
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    const result = await authService.me(request.userId)
    return reply.status(200).send(result)
  },
}