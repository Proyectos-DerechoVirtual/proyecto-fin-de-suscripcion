const BASE = 'https://developers.teachable.com/v1';

function headers() {
  return { apiKey: process.env.TEACHABLE_API_KEY, Accept: 'application/json' };
}

/**
 * Obtiene TODOS los enrollments de un curso (paginado).
 */
export async function getAllEnrollments(courseId) {
  const all = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `${BASE}/courses/${courseId}/enrollments?page=${page}&per_page=100`,
      { headers: headers() }
    );

    if (!res.ok) {
      if (res.status === 404) break;
      console.error(`Teachable enrollments error: ${res.status}`);
      break;
    }

    const data = await res.json();
    const enrollments = data.enrollments || [];

    if (enrollments.length === 0) break;

    all.push(...enrollments);
    page++;
    hasMore = data.meta && page <= data.meta.number_of_pages;
  }

  return all;
}

/**
 * Filtra enrollments vencidos por fecha:
 * enrolled_at + period meses < ahora y enrolled_at >= FECHA_MINIMA.
 * No filtra por contactados (eso se hace después, cuando tenemos el email del usuario).
 */
export function filterExpired(enrollments, periodMonths) {
  const now = new Date();
  const MIN_DATE = new Date('2025-03-01T00:00:00Z');
  const expired = [];

  for (const e of enrollments) {
    if (!e.enrolled_at) continue;

    const enrolled = new Date(e.enrolled_at);
    if (enrolled < MIN_DATE) continue;

    const expiry = new Date(enrolled);
    expiry.setMonth(expiry.getMonth() + periodMonths);
    if (expiry > now) continue;

    expired.push({
      user_id: e.user_id,
      enrolled_at: e.enrolled_at,
      expiry_date: expiry.toISOString().split('T')[0],
    });
  }

  return expired;
}

/**
 * Obtiene detalles de un usuario por ID.
 */
export async function getUserDetails(userId) {
  try {
    const res = await fetch(`${BASE}/users/${userId}`, { headers: headers() });
    if (!res.ok) return null;
    const data = await res.json();
    return { name: data.name, email: data.email };
  } catch (err) {
    console.error('Teachable getUserDetails error:', err.message);
    return null;
  }
}
