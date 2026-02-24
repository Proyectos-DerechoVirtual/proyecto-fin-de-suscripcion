export const COURSES = [
  { id: 2854170, name: 'Membresía Derecho Virtual', months: 12 },
  { id: 1994647, name: 'Oposiciones Justicia', months: 12 },
];

export function buildMsgInterno({ nombre, phone, email, courseName }) {
  if (phone) {
    return (
      `🔔 OPORTUNIDAD DE COMPRA\n` +
      `${nombre} con número ${phone} (${email}) acaba de perder acceso a ${courseName}.\n` +
      `→ Escribirle para ofrecerle renovación.`
    );
  }
  return (
    `🔔 OPORTUNIDAD DE COMPRA\n` +
    `${nombre} (${email}) acaba de perder acceso a ${courseName}.\n` +
    `⚠️ Sin teléfono en Calendly. Contactar por email.`
  );
}

export function buildMsgAlumno({ primerNombre, courseName }) {
  return (
    `Hola ${primerNombre}, ¡buenas tardes! Soy Lucía, del equipo de Derecho Virtual 😊\n\n` +
    `Te escribo porque hemos visto que tu formación de *${courseName}* ha llegado a su fin ` +
    `y queríamos saber cómo te ha ido.\n\n` +
    `¿Has tenido oportunidad de aplicar lo aprendido? ` +
    `¿Te gustaría seguir teniendo acceso al contenido actualizado?\n\n` +
    `Tenemos opciones de renovación que pueden interesarte. ` +
    `Si quieres, te cuento sin compromiso 😉\n\n` +
    `¡Un saludo!`
  );
}
