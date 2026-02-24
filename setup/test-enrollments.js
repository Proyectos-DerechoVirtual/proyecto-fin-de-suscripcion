/**
 * Test local de enrollments: `node --env-file=.env setup/test-enrollments.js`
 * Muestra cuántos alumnos tienen suscripción vencida por curso.
 */

import { COURSES } from '../lib/messages.js';
import { getAllEnrollments, filterExpired, getUserDetails } from '../lib/teachable.js';
import { getContactadosSet } from '../lib/supabase.js';

async function main() {
  const courseIds = COURSES.map(c => c.id);
  const contactadosSet = await getContactadosSet(courseIds);
  console.log(`Contactados previos: ${contactadosSet.size}\n`);

  for (const course of COURSES) {
    console.log(`--- ${course.name} (${course.id}) ---`);
    const enrollments = await getAllEnrollments(course.id);
    console.log(`  Total enrollments: ${enrollments.length}`);

    const expired = filterExpired(enrollments, course.months);
    console.log(`  Vencidos por fecha: ${expired.length}`);

    for (const e of expired.slice(0, 5)) {
      const details = await getUserDetails(e.user_id);
      const email = details?.email || '?';
      const contacted = contactadosSet.has(`${email.toLowerCase()}|${course.id}`);
      console.log(`    ${details?.name} (${email}) | expired: ${e.expiry_date}${contacted ? ' [YA CONTACTADO]' : ''}`);
    }
    if (expired.length > 5) console.log(`    ... y ${expired.length - 5} más`);
    console.log();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
