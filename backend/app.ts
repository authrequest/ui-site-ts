import { Hono } from 'hono'

export const app = new Hono()

app.get('/api/products', (c) => {
  // You should import or access your knownProducts here
  // For demo, return an empty array
  return c.json([])
})

export type AppType = typeof app
export default app