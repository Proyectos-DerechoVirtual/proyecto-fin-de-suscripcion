/**
 * Test de conexiones: ejecutar con `node --env-file=.env setup/test-connections.js`
 * Verifica que todas las credenciales y APIs funcionan.
 */

async function testSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data, error } = await client
    .from('renovaciones_contactados')
    .select('id')
    .limit(1);

  if (error) throw new Error(`Supabase: ${error.message}`);
  console.log(`  Supabase OK - tabla accesible (${data.length} rows sample)`);
}

async function testTeachable() {
  const res = await fetch(
    'https://developers.teachable.com/v1/courses/2854170/enrollments?page=1&per_page=1',
    { headers: { apiKey: process.env.TEACHABLE_API_KEY, Accept: 'application/json' } }
  );

  if (!res.ok) throw new Error(`Teachable: HTTP ${res.status}`);
  const data = await res.json();
  const count = data.meta?.total || data.enrollments?.length || 0;
  console.log(`  Teachable OK - curso 2854170 tiene enrollments (total: ${count})`);
}

async function testCalendly() {
  const res = await fetch(
    `https://api.calendly.com/users/me`,
    { headers: { Authorization: `Bearer ${process.env.CALENDLY_TOKEN}` } }
  );

  if (!res.ok) throw new Error(`Calendly: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`  Calendly OK - user: ${data.resource?.name}`);
}

async function testUltraMsg() {
  const instance = process.env.ULTRAMSG_INSTANCE;
  const token = process.env.ULTRAMSG_TOKEN;
  const res = await fetch(
    `https://api.ultramsg.com/${instance}/instance/status?token=${token}`
  );

  if (!res.ok) throw new Error(`UltraMsg: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`  UltraMsg OK - status: ${JSON.stringify(data.status || data)}`);
}

async function main() {
  console.log('Testing connections...\n');
  const tests = [
    ['Supabase', testSupabase],
    ['Teachable', testTeachable],
    ['Calendly', testCalendly],
    ['UltraMsg', testUltraMsg],
  ];

  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
    } catch (err) {
      console.log(`  ${name} FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

main();
