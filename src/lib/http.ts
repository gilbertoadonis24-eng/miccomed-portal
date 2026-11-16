export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export function notFound(): Response {
  return json({ error: "not_found" }, 404);
}
