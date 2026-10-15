import type { FastifyReply, FastifyRequest } from "fastify"
import { createInventoryService } from "../application/inventory.service"
import { InventoryRepository } from "../infrastructure/inventory.drizzle.repository"
import { CreateMovementDtoSchema, MovementQuerySchema } from "./inventory.dto"

const inventoryService = createInventoryService(InventoryRepository)

export const inventoryController = {
  async listMovements(request: FastifyRequest, reply: FastifyReply) {
    const query = MovementQuerySchema.parse(request.query)
    const result = await inventoryService.listMovements(query)
    return reply.status(200).send(result)
  },

  async createMovement(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateMovementDtoSchema.parse(request.body)
    const result = await inventoryService.createMovement(body, request.userId)
    return reply.status(201).send(result)
  },

  async lowStock(request: FastifyRequest, reply: FastifyReply) {
    const result = await inventoryService.lowStock()
    return reply.status(200).send(result)
  },
}