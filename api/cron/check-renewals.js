import { COURSES, buildMsgInterno, buildMsgAlumno } from '../../lib/messages.js';
import { getContactadosSet, upsertContactado } from '../../lib/supabase.js';
import { getAllEnrollments, filterExpired, getUserDetails } from '../../lib/teachable.js';
import { findPhone } from '../../lib/calendly.js';
import { sendWhatsApp } from '../../lib/ultramsg.js';

export default async function handler(req, res) {
  // Verificar clave secreta
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = process.env.DRY_RUN === 'true';
  const maxMessages = parseInt(process.env.MAX_MESSAGES_PER_RUN || '5');
  const adminGroup = process.env.ADMIN_GROUP;
  let messagesSent = 0;

  const log = {
    startedAt: new Date().toISOString(),
    dryRun,
    maxMessages,
    coursesProcessed: [],
    errors: [],
  };

  try {
    // 1. Cargar contactados previos (anti-spam)
    const courseIds = COURSES.map(c => c.id);
    const contactadosSet = await getContactadosSet(courseIds);
    log.totalContactadosPrevios = contactadosSet.size;

    // 2. Procesar cada curso
    for (const course of COURSES) {
      const courseLog = {
        courseId: course.id,
        courseName: course.name,
        totalEnrollments: 0,
        expiredByDate: 0,
        skippedAlreadyContacted: 0,
        processed: [],
      };

      try {
        // 2a. Obtener todos los enrollments
        const enrollments = await getAllEnrollments(course.id);
        courseLog.totalEnrollments = enrollments.length;

        // 2b. Filtrar vencidos por fecha (sin email aún, enrollment no tiene email)
        const expiredByDate = filterExpired(enrollments, course.months);
        courseLog.expiredByDate = expiredByDate.length;

        if (expiredByDate.length === 0) {
          log.coursesProcessed.push(courseLog);
          continue;
        }

        // 2c. Procesar cada vencido
        for (const student of expiredByDate) {
          if (messagesSent >= maxMessages) {
            console.log(`Limite alcanzado (${maxMessages})`);
            break;
          }

          const entry = { userId: student.user_id, expiryDate: student.expiry_date };

          try {
            // Obtener nombre y email del usuario
            const userDetails = await getUserDetails(student.user_id);
            if (!userDetails) {
              entry.status = 'skipped_no_user';
              courseLog.processed.push(entry);
              continue;
            }

            const email = (userDetails.email || '').toLowerCase();
            const nombre = userDetails.name || 'Alumno/a';
            const primerNombre = nombre.split(' ')[0];
            entry.email = email;
            entry.nombre = nombre;

            // Anti-spam: saltar si ya fue contactado para este curso
            if (contactadosSet.has(`${email}|${course.id}`)) {
              entry.status = 'skipped_already_contacted';
              courseLog.skippedAlreadyContacted++;
              courseLog.processed.push(entry);
              continue;
            }

            // Buscar teléfono en Calendly
            const { phone, calendlyFound } = await findPhone(email);
            entry.phone = phone;
            entry.calendlyFound = calendlyFound;

            // Mensaje interno al grupo admin (siempre)
            const msgInterno = buildMsgInterno({
              nombre,
              phone,
              email,
              courseName: course.name,
            });

            if (dryRun) {
              console.log(`[DRY RUN] Notif interna: ${email}`);
              entry.internaStatus = 'dry_run';
            } else {
              await sendWhatsApp(adminGroup, msgInterno);
              entry.internaStatus = 'sent';
            }

            // Mensaje al alumno (solo si tiene teléfono)
            if (phone) {
              const msgAlumno = buildMsgAlumno({
                primerNombre,
                courseName: course.name,
              });

              if (dryRun) {
                console.log(`[DRY RUN] Msg alumno: ${phone} (${email})`);
                entry.alumnoStatus = 'dry_run';
              } else {
                await sendWhatsApp(phone, msgAlumno);
                entry.alumnoStatus = 'sent';
              }
            } else {
              entry.alumnoStatus = 'skipped_no_phone';
            }

            // Guardar en Supabase (anti-spam para futuras ejecuciones)
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
              entry.supabaseStatus = 'saved';
            } else {
              entry.supabaseStatus = 'dry_run';
            }

            messagesSent++;
            entry.status = 'ok';
          } catch (err) {
            entry.status = 'error';
            entry.error = err.message;
            log.errors.push(`user ${student.user_id}: ${err.message}`);
          }

          courseLog.processed.push(entry);
        }
      } catch (err) {
        courseLog.error = err.message;
        log.errors.push(`Course ${course.id}: ${err.message}`);
      }

      log.coursesProcessed.push(courseLog);
    }

    log.totalMessagesSent = messagesSent;
    log.finishedAt = new Date().toISOString();
    return res.status(200).json(log);
  } catch (err) {
    log.errors.push(`General: ${err.message}`);
    log.finishedAt = new Date().toISOString();
    return res.status(500).json(log);
  }
}
