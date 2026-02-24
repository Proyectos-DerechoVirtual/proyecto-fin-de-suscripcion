import { findPhone } from '../../lib/calendly.js';

export default async function handler(req, res) {
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Missing ?email= parameter' });
  }

  try {
    const result = await findPhone(email);
    return res.status(200).json({
      email,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
