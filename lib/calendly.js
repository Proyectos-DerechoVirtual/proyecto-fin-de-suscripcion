const API = 'https://api.calendly.com';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.CALENDLY_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Busca el teléfono de un email en Calendly.
 * 1. Busca eventos donde el email fue invitado
 * 2. Para el primer evento, obtiene invitees
 * 3. Extrae teléfono de questions_and_answers
 *
 * Retorna { phone, calendlyFound }
 */
export async function findPhone(email) {
  try {
    // Buscar eventos con este invitee
    const params = new URLSearchParams({
      user: process.env.CALENDLY_USER,
      organization: process.env.CALENDLY_ORG,
      invitee_email: email,
      count: '1',
    });

    const eventsRes = await fetch(`${API}/scheduled_events?${params}`, {
      headers: authHeaders(),
    });

    if (!eventsRes.ok) {
      console.error(`Calendly events error: ${eventsRes.status}`);
      return { phone: null, calendlyFound: false };
    }

    const eventsData = await eventsRes.json();
    const events = eventsData.collection || [];

    if (events.length === 0) {
      return { phone: null, calendlyFound: false };
    }

    // Obtener invitees del primer evento
    const eventUri = events[0].uri;
    const invRes = await fetch(`${eventUri}/invitees`, {
      headers: authHeaders(),
    });

    if (!invRes.ok) {
      return { phone: null, calendlyFound: true };
    }

    const invData = await invRes.json();
    const invitees = invData.collection || [];

    // Buscar teléfono en Q&A
    const phoneKeywords = ['teléfono', 'telefono', 'phone', 'whatsapp', 'móvil', 'movil', 'celular', 'numero'];

    for (const inv of invitees) {
      for (const qa of inv.questions_and_answers || []) {
        const q = (qa.question || '').toLowerCase();
        const a = (qa.answer || '').trim();
        if (phoneKeywords.some(kw => q.includes(kw)) && a) {
          let phone = a.replace(/[^0-9+]/g, '');
          if (phone && !phone.startsWith('+')) {
            phone = phone.length <= 9 ? `+34${phone}` : `+${phone}`;
          }
          if (phone) return { phone, calendlyFound: true };
        }
      }
    }

    return { phone: null, calendlyFound: true };
  } catch (err) {
    console.error('Calendly findPhone error:', err.message);
    return { phone: null, calendlyFound: false };
  }
}
