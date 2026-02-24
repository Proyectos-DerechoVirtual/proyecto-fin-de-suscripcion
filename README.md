# Renovación Suscripción - WhatsApp Automático

Sistema automatizado que detecta alumnos con suscripción vencida en Teachable y les envía un mensaje de WhatsApp ofreciéndoles renovar.

## Cómo funciona

1. **Obtiene los alumnos matriculados** de cada curso desde la API de Teachable
2. **Calcula quién venció** — si la fecha de matrícula + 12 meses ya pasó, el alumno está vencido
3. **Verifica que no se le haya escrito antes** — consulta una tabla en Supabase (anti-spam)
4. **Busca su teléfono en Calendly** — si el alumno agendó alguna cita, extrae el teléfono del formulario
5. **Envía notificación al grupo admin** — WhatsApp al equipo interno con los datos del alumno
6. **Envía mensaje al alumno** (si tiene teléfono) — WhatsApp personalizado ofreciendo opciones de renovación
7. **Registra al alumno como contactado** — para no volver a escribirle

## Protecciones

| Control | Descripción |
|---------|-------------|
| **Anti-spam** | Un alumno nunca recibe dos mensajes para el mismo curso (registro en Supabase con `UNIQUE(email, course_id)`) |
| **MAX_MESSAGES_PER_RUN** | Máximo de mensajes por ejecución (default: 5) |
| **DRY_RUN** | Modo simulación que no envía nada real |
| **CRON_SECRET** | Clave requerida para ejecutar el endpoint |
| **Fecha mínima** | Solo procesa alumnos matriculados desde marzo 2025 |

## Arquitectura

```
api/
  health.js                  → Health check
  cron/check-renewals.js     → Endpoint principal (cron diario)
  test/enrollments.js        → Test: ver vencimientos
  test/calendly.js           → Test: buscar teléfono por email
  test/whatsapp.js           → Test: enviar mensaje de prueba
lib/
  supabase.js                → Anti-spam (leer/guardar contactados)
  teachable.js               → Enrollments + filtro vencidos
  calendly.js                → Buscar teléfono por email
  ultramsg.js                → Enviar WhatsApp via UltraMsg
  messages.js                → Cursos y plantillas de mensajes
setup/
  migration.sql              → SQL para crear la tabla en Supabase
  test-connections.js        → Test local de las 4 APIs
  test-enrollments.js        → Test local de vencimientos
  test-cron.js               → Simulación local del cron completo
```

## APIs utilizadas

- **Teachable** — Enrollments y datos de usuarios
- **Calendly** — Búsqueda de teléfono por email
- **UltraMsg** — Envío de WhatsApp
- **Supabase** — Base de datos anti-spam

## Despliegue

- Hospedado en **Vercel** (serverless)
- Deploy automático con cada push a `main`
- Cron diario configurado en **cron-job.org** (10:00 AM)

## Variables de entorno

Ver `.env.example` para la lista completa. Se configuran en Vercel > Settings > Environment Variables.
