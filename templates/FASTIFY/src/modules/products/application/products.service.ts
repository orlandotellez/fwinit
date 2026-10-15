import { ConflictError, NotFoundError } from "@/core/errors/AppError"
import { isUniqueViolation } from "@/core/errors/db-errors"
import type { CreateProductData, UpdateProductData } from "../domain/products.entities"
import type { IProductListResponse, IProductResponse } from "../domain/products.types"
import type { IProductRepository } from "../domain/products.interface"
import { mapProductToResponse } from "./common/products.mappers"

export const createProductService = (repository: IProductRepository) => ({
  async list(params?: { search?: string; active?: boolean; page?: number; limit?: number }): Promise<IProductListResponse> {
    const result = await repository.findAll(params)
    return {
      products: result.products.map(mapProductToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    }
  },

  async getById(id: string): Promise<IProductResponse> {
    const product = await repository.findById(id)
    if (!product) {
      throw new NotFoundError("Product not found")
    }
    return mapProductToResponse(product)
  },

  async create(data: CreateProductData): Promise<IProductResponse> {
    try {
      const product = await repository.create(data)
      return mapProductToResponse(product)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Barcode already exists")
      }
      throw error
    }
  },

  async update(id: string, data: UpdateProductData): Promise<IProductResponse> {
    const existing = await repository.findById(id)
    if (!existing) {
      throw new NotFoundError("Product not found")
    }
    try {
      const product = await repository.update(id, data)
      return mapProductToResponse(product)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Barcode already exists")
      }
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await repository.findById(id)
    if (!existing) {
      throw new NotFoundError("Product not found")
    }
    await repository.softDelete(id)
  },
})