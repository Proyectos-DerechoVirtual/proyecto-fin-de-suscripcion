import { COURSES } from '../../lib/messages.js';
import { getAllEnrollments, filterExpired, getUserDetails } from '../../lib/teachable.js';
import { getContactadosSet } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const log = { startedAt: new Date().toISOString(), courses: [], errors: [] };

  try {
    const courseIds = COURSES.map(c => c.id);
    const contactadosSet = await getContactadosSet(courseIds);
    log.contactadosPrevios = contactadosSet.size;

    for (const course of COURSES) {
      const entry = { courseId: course.id, courseName: course.name };

      try {
        const enrollments = await getAllEnrollments(course.id);
        entry.totalEnrollments = enrollments.length;

        const expired = filterExpired(enrollments, course.months);
        entry.expiredByDate = expired.length;

        // Obtener detalles de los primeros vencidos como ejemplo
        const samples = [];
        for (const e of expired.slice(0, 5)) {
          const details = await getUserDetails(e.user_id);
          const email = (details?.email || '').toLowerCase();
          samples.push({
            user_id: e.user_id,
            email,
            name: details?.name,
            enrolled_at: e.enrolled_at,
            expiry_date: e.expiry_date,
            alreadyContacted: contactadosSet.has(`${email}|${course.id}`),
          });
        }
        entry.expiredSample = samples;
      } catch (err) {
        entry.error = err.message;
        log.errors.push(`Course ${course.id}: ${err.message}`);
      }

      log.courses.push(entry);
    }

    log.finishedAt = new Date().toISOString();
    return res.status(200).json(log);
  } catch (err) {
    log.errors.push(err.message);
    log.finishedAt = new Date().toISOString();
    return res.status(500).json(log);
  }
}
