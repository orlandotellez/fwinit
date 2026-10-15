import { pgTable, text, uuid, timestamp, integer, numeric } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { product } from "./catalog"

export const inventoryMovement = pgTable("inventory_movement", {
  id: uuid("id").primaryKey(),
  productId: uuid("product_id").references(() => product.id).notNull(),
  userId: uuid("user_id").references(() => user.id).notNull(),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
