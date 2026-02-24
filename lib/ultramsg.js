/**
 * Envía un mensaje WhatsApp via UltraMsg.
 * Retorna la respuesta de la API.
 */
export async function sendWhatsApp(to, body) {
  const instance = process.env.ULTRAMSG_INSTANCE;
  const token = process.env.ULTRAMSG_TOKEN;

  const res = await fetch(
    `https://api.ultramsg.com/${instance}/messages/chat?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UltraMsg error ${res.status}: ${text}`);
  }

  return res.json();
}
