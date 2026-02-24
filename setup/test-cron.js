/**
 * Simula el cron handler localmente: `node --env-file=.env setup/test-cron.js`
 * Usa DRY_RUN y MAX_MESSAGES_PER_RUN del .env
 */

import { COURSES, buildMsgInterno, buildMsgAlumno } from '../lib/messages.js';
import { getContactadosSet, upsertContactado } from '../lib/supabase.js';
import { getAllEnrollments, filterExpired, getUserDetails } from '../lib/teachable.js';
import { findPhone } from '../lib/calendly.js';
import { sendWhatsApp } from '../lib/ultramsg.js';

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const maxMessages = parseInt(process.env.MAX_MESSAGES_PER_RUN || '5');
  const adminGroup = process.env.ADMIN_GROUP;
  let messagesSent = 0;

  console.log(`=== CRON SIMULATION ===`);
  console.log(`DRY_RUN: ${dryRun}`);
  console.log(`MAX_MESSAGES: ${maxMessages}\n`);

  // 1. Anti-spam
  const courseIds = COURSES.map(c => c.id);
  const contactadosSet = await getContactadosSet(courseIds);
  console.log(`Contactados previos: ${contactadosSet.size}\n`);

  for (const course of COURSES) {
    console.log(`--- ${course.name} (${course.id}) ---`);

    const enrollments = await getAllEnrollments(course.id);
    console.log(`  Total enrollments: ${enrollments.length}`);

    const expiredByDate = filterExpired(enrollments, course.months);
    console.log(`  Vencidos por fecha: ${expiredByDate.length}`);

    if (expiredByDate.length === 0) {
      console.log(`  Nada que procesar.\n`);
      continue;
    }

    let skipped = 0;
    for (const student of expiredByDate) {
      if (messagesSent >= maxMessages) {
        console.log(`  ⚠️ Limite alcanzado (${maxMessages})`);
        break;
      }

      // Obtener datos del usuario
      const userDetails = await getUserDetails(student.user_id);
      if (!userDetails) {
        console.log(`  ❌ user_id ${student.user_id}: sin datos en Teachable (skip)`);
        continue;
      }

      const email = (userDetails.email || '').toLowerCase();
      const nombre = userDetails.name || 'Alumno/a';
      const primerNombre = nombre.split(' ')[0];

      // Anti-spam check
      if (contactadosSet.has(`${email}|${course.id}`)) {
        skipped++;
        continue;
      }

      console.log(`\n  👤 ${nombre} (${email})`);
      console.log(`     Matriculado: ${student.enrolled_at} → Venció: ${student.expiry_date}`);

      // Calendly
      const { phone, calendlyFound } = await findPhone(email);
      console.log(`     Calendly: ${calendlyFound ? 'encontrado' : 'no encontrado'} | Teléfono: ${phone || 'NO'}`);

      // Mensaje interno
      const msgInterno = buildMsgInterno({ nombre, phone, email, courseName: course.name });
      if (dryRun) {
        console.log(`     [DRY] Notif interna → grupo admin`);
        console.log(`           "${msgInterno.substring(0, 80)}..."`);
      } else {
        await sendWhatsApp(adminGroup, msgInterno);
        console.log(`     ✅ Notif interna enviada`);
      }

      // Mensaje alumno
      if (phone) {
        const msgAlumno = buildMsgAlumno({ primerNombre, courseName: course.name });
        if (dryRun) {
          console.log(`     [DRY] Msg alumno → ${phone}`);
          console.log(`           "${msgAlumno.substring(0, 80)}..."`);
        } else {
          await sendWhatsApp(phone, msgAlumno);
          console.log(`     ✅ Msg alumno enviado a ${phone}`);
        }
      } else {
        console.log(`     ⚠️ Sin teléfono → no se envía msg al alumno`);
      }

      // Supabase
      if (!dryRun) {
        await upsertContactado({
          user_id: student.user_id,
          email,
          course_id: course.id,
          course_name: course.name,
          nombre,
          phone,
          calendly_found: calendlyFound,
        });
        console.log(`     ✅ Guardado en Supabase`);
      } else {
        console.log(`     [DRY] Supabase: no se guarda`);
      }

      messagesSent++;
    }

    if (skipped > 0) console.log(`\n  Saltados (ya contactados): ${skipped}`);
    console.log();
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Total procesados: ${messagesSent}`);
  console.log(`DRY_RUN: ${dryRun}`);
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
