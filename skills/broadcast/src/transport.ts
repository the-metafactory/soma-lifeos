export type Transport = (url: string, init: RequestInit) => Promise<Response>;

export const network: Transport = (url, init) => fetch(url, {
  ...init,
  redirect: "error",
  signal: AbortSignal.timeout(30_000),
});
