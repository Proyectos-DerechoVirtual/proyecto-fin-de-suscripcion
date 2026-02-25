import { COURSES } from '../../lib/messages.js';
import { getAllEnrollments, getUserDetails } from '../../lib/teachable.js';

export default async function handler(req, res) {
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const days = parseInt(req.query.days || '60');
  const MIN_DATE = new Date('2025-03-01T00:00:00Z');
  const now = new Date();
  const result = { generatedAt: now.toISOString(), windowDays: days, courses: [] };

  for (const course of COURSES) {
    const courseData = { name: course.name, id: course.id, students: [] };
    const enrollments = await getAllEnrollments(course.id);

    const upcoming = [];
    for (const e of enrollments) {
      if (!e.enrolled_at) continue;
      const enrolled = new Date(e.enrolled_at);
      if (enrolled < MIN_DATE) continue;
      const expiry = new Date(enrolled);
      expiry.setMonth(expiry.getMonth() + course.months);
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0 && daysLeft <= days) {
        upcoming.push({ user_id: e.user_id, enrolled_at: e.enrolled_at, expiry: expiry.toISOString().split('T')[0], daysLeft });
      }
    }

    upcoming.sort((a, b) => a.daysLeft - b.daysLeft);

    for (const u of upcoming) {
      const details = await getUserDetails(u.user_id);
      courseData.students.push({
        name: details?.name || '?',
        email: details?.email || '?',
        enrolledAt: u.enrolled_at,
        expiresAt: u.expiry,
        daysLeft: u.daysLeft,
      });
    }

    courseData.total = courseData.students.length;
    result.courses.push(courseData);
  }

  return res.status(200).json(result);
}
