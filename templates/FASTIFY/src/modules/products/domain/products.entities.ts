export interface IProductEntity {
  id: string
  barcode: string | null
  name: string
  price: number
  cost: number | null
  stock: number
  low_stock_threshold: number
  active: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type CreateProductData = {
  barcode?: string | null
  name: string
  price: number
  cost?: number | null
  stock?: number
  low_stock_threshold?: number
  active?: boolean
}

export type UpdateProductData = {
  barcode?: string | null
  name?: string
  price?: number
  cost?: number | null
  low_stock_threshold?: number
  active?: boolean
}