export async function sessaoIsolada(page) {
  await page.addInitScript(() => {
    const user = { id: 998, company_id: 998, name: 'Teste de postes', email: 'postes@example.test', admin: true }
    window.siasgl = {
      session: async () => ({ user }),
      request: async (_endpoint, _method, body) => ({ ok: true, status: 200,
        data: { user, settings: null, projects: [], version: (body?.version ?? 0) + 1 } }),
      logout: async () => {},
    }
  })
}
