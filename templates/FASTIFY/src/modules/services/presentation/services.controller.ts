import type { FastifyReply, FastifyRequest } from "fastify"
import { createServiceService } from "../application/services.service"
import { ServiceRepository } from "../infrastructure/services.drizzle.repository"
import { CreateServiceDtoSchema, ServiceQuerySchema, UpdateServiceDtoSchema } from "./services.dto"

const serviceService = createServiceService(ServiceRepository)

export const servicesController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = ServiceQuerySchema.parse(request.query)
    const result = await serviceService.list({
      ...query,
      active: query.active === undefined ? undefined : query.active === "true",
    })
    return reply.status(200).send(result)
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await serviceService.getById(id)
    return reply.status(200).send(result)
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateServiceDtoSchema.parse(request.body)
    const result = await serviceService.create(body)
    return reply.status(201).send(result)
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const body = UpdateServiceDtoSchema.parse(request.body)
    const result = await serviceService.update(id, body)
    return reply.status(200).send(result)
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await serviceService.delete(id)
    return reply.status(200).send({ message: "Service deleted successfully" })
  },
}