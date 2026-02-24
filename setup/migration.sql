-- Tabla: renovaciones_contactados
-- Anti-spam: un solo mensaje por alumno+curso gracias a UNIQUE(email, course_id)

CREATE TABLE IF NOT EXISTS renovaciones_contactados (
  id          bigserial    PRIMARY KEY,
  user_id     integer      NOT NULL,
  email       text         NOT NULL,
  course_id   integer      NOT NULL,
  course_name text,
  nombre      text,
  phone       text,
  calendly_found boolean   DEFAULT false,
  contacted_at timestamptz DEFAULT now(),
  UNIQUE(email, course_id)
);
