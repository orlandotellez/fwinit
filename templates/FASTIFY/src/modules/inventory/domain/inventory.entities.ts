export type MovementType = "entrada" | "salida" | "ajuste"

export interface IInventoryMovementEntity {
  id: string
  product_id: string
  product: {
    id: string
    name: string
    barcode: string | null
  }
  user_id: string
  user: {
    id: string
    name: string
    email: string
  }
  type: MovementType
  quantity: number
  unit_cost: number | null
  note: string | null
  created_at: Date
}

export interface IProductStockInfo {
  id: string
  stock: number
  active: boolean
  deleted_at: Date | null
}

export type CreateMovementData = {
  product_id: string
  type: MovementType
  quantity: number
  unit_cost?: number
  note?: string
}