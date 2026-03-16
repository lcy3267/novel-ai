/**
 * JWT 认证中间件
 * 在需要登录的路由中使用：{ preHandler: [authenticate] }
 */
export async function authenticate(request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: '未登录或 Token 已过期，请重新登录' })
  }
}
