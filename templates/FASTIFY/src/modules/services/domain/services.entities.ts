export interface IServiceEntity {
  id: string
  name: string
  description: string | null
  base_price: number
  is_active: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type CreateServiceData = {
  name: string
  description?: string | null
  base_price: number
  is_active?: boolean
}

export type UpdateServiceData = {
  name?: string
  description?: string | null
  base_price?: number
  is_active?: boolean
}