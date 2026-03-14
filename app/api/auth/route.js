export async function POST(request) {
  const sitePassword = process.env.SITE_PASSWORD;

  // If no password is configured, auth is disabled — always allow
  if (!sitePassword) {
    return Response.json({ ok: true, authDisabled: true });
  }

  const { password } = await request.json();

  if (password === sitePassword) {
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Incorrect password' }, { status: 401 });
}
