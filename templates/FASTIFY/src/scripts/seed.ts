import { randomUUID } from "node:crypto"
import bcrypt from "bcrypt"
import { sql } from "drizzle-orm"
import { db } from "@/db"
import { product, role, user } from "@/db/schema"

const SALT_ROUNDS = 10

async function main() {
  const [adminRole] = await db
    .insert(role)
    .values({ id: randomUUID(), name: "admin", description: "Full access to the system" })
    .onConflictDoUpdate({ target: role.name, set: { name: sql`excluded.name` } })
    .returning()

  const [staffRole] = await db
    .insert(role)
    .values({ id: randomUUID(), name: "staff", description: "Can manage products, services and inventory" })
    .onConflictDoUpdate({ target: role.name, set: { name: sql`excluded.name` } })
    .returning()

  const adminPasswordHash = await bcrypt.hash("admin123", SALT_ROUNDS)
  await db
    .insert(user)
    .values({
      id: randomUUID(),
      name: "Admin",
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
    })
    .onConflictDoUpdate({ target: user.email, set: { email: sql`excluded.email` } })
    .returning()

  const staffPasswordHash = await bcrypt.hash("staff123", SALT_ROUNDS)
  await db
    .insert(user)
    .values({
      id: randomUUID(),
      name: "Staff",
      email: "staff@example.com",
      passwordHash: staffPasswordHash,
      roleId: staffRole.id,
    })
    .onConflictDoUpdate({ target: user.email, set: { email: sql`excluded.email` } })
    .returning()

  const products = [
    { name: "Coca-Cola 500ml", barcode: "7790000000011", price: 1.5, cost: 1.1, stock: 50, lowStockThreshold: 10 },
    { name: "Papas Lays 125g", barcode: "7790000000028", price: 2.0, cost: 1.4, stock: 30, lowStockThreshold: 10 },
    { name: "Agua mineral 600ml", barcode: "7790000000035", price: 0.8, cost: 0.4, stock: 8, lowStockThreshold: 10 },
    { name: "Chocolate 70g", price: 1.2, cost: 0.9, stock: 20, lowStockThreshold: 5 },
  ]

  for (const item of products) {
    const values = {
      id: randomUUID(),
      name: item.name,
      barcode: item.barcode ?? null,
      price: item.price.toString(),
      cost: item.cost.toString(),
      stock: item.stock,
      lowStockThreshold: item.lowStockThreshold,
    }

    if (item.barcode) {
      await db
        .insert(product)
        .values(values)
        .onConflictDoUpdate({ target: product.barcode, set: { barcode: sql`excluded.barcode` } })
        .returning()
    } else {
      await db.insert(product).values(values)
    }
  }

  console.log("Seed completed: roles, users and products created")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$client.end()
  })
