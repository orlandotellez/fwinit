import type { FastifyReply, FastifyRequest } from "fastify"
import { createProductService } from "../application/products.service"
import { ProductRepository } from "../infrastructure/products.drizzle.repository"
import { CreateProductDtoSchema, ProductQuerySchema, UpdateProductDtoSchema } from "./products.dto"

const productService = createProductService(ProductRepository)

export const productsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = ProductQuerySchema.parse(request.query)
    const result = await productService.list({
      ...query,
      active: query.active === undefined ? undefined : query.active === "true",
    })
    return reply.status(200).send(result)
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await productService.getById(id)
    return reply.status(200).send(result)
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = CreateProductDtoSchema.parse(request.body)
    const result = await productService.create(body)
    return reply.status(201).send(result)
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const body = UpdateProductDtoSchema.parse(request.body)
    const result = await productService.update(id, body)
    return reply.status(200).send(result)
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await productService.delete(id)
    return reply.status(200).send({ message: "Product deleted successfully" })
  },
}