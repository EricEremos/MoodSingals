export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

export function noContent(status = 204) {
  return new Response(null, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  })
}
