export function registerHealthRoute(app: any): void {
  app.get('/healthz', async () => ({ status: 'ok' }));
}
