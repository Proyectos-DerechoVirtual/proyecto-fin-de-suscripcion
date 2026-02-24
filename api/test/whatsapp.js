import { sendWhatsApp } from '../../lib/ultramsg.js';

export default async function handler(req, res) {
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Envía un mensaje de prueba al grupo admin
  const adminGroup = process.env.ADMIN_GROUP;
  const body = `Test desde Vercel - ${new Date().toISOString()}`;

  try {
    const result = await sendWhatsApp(adminGroup, body);
    return res.status(200).json({
      status: 'sent',
      to: adminGroup,
      apiResponse: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
