import type { FastifyReply, FastifyRequest } from "fastify"
import { BadRequestError } from "@/core/errors/AppError"
import { createUserService } from "../application/users.service"
import { UserRepository } from "../infrastructure/users.drizzle.repository"
import { CreateUserDtoSchema, ToggleActiveDtoSchema, UpdateUserDtoSchema, UserQuerySchema } from "./users.dto"

const userService = createUserService(UserRepository)

export const usersController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = UserQuerySchema.parse(request.query)
    const result = await userService.list(query)
    return reply.status(200).send(result)
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await userService.getById(id)
    return reply.status(200).send(result)
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateUserDtoSchema.parse(request.body)
    const result = await userService.create(body)
    return reply.status(201).send(result)
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const body = UpdateUserDtoSchema.parse(request.body)
    const result = await userService.update(id, body)
    return reply.status(200).send(result)
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    if (id === request.userId) {
      throw new BadRequestError("You cannot delete your own account")
    }
    await userService.delete(id)
    return reply.status(200).send({ message: "User deleted successfully" })
  },

  async toggleActive(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { is_active } = ToggleActiveDtoSchema.parse(request.body)
    const result = await userService.update(id, { is_active })
    return reply.status(200).send(result)
  },
}