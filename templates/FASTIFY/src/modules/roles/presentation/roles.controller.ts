import type { FastifyReply, FastifyRequest } from "fastify"
import { createRoleService } from "../application/roles.service"
import { RoleRepository } from "../infrastructure/roles.drizzle.repository"
import { CreateRoleDtoSchema, RoleQuerySchema, UpdateRoleDtoSchema } from "./roles.dto"

const roleService = createRoleService(RoleRepository)

export const rolesController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = RoleQuerySchema.parse(request.query)
    const result = await roleService.list(query)
    return reply.status(200).send(result)
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await roleService.getById(id)
    return reply.status(200).send(result)
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateRoleDtoSchema.parse(request.body)
    const result = await roleService.create(body)
    return reply.status(201).send(result)
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const body = UpdateRoleDtoSchema.parse(request.body)
    const result = await roleService.update(id, body)
    return reply.status(200).send(result)
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await roleService.delete(id)
    return reply.status(200).send({ message: "Role deleted successfully" })
  },
}