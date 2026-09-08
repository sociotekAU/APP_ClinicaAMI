-- CLÍNICA A.M.I. — DATOS INICIALES Y DE DEMOSTRACIÓN
--
-- Credenciales temporales solicitadas:
--   Administrador: admin_ami / AmiAzul#27
--   Doctor Moisés: moises / MoisesSalud#27
--
-- PostgreSQL convierte las contraseñas a bcrypt al ejecutar este archivo.
-- Ambos usuarios deben cambiar su contraseña durante el primer acceso.
-- Los datos marcados como demostración deben sustituirse antes de producción.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles ----------------------------------------------------------------------

INSERT INTO tb_roles (nombre_rol, descripcion, estado)
VALUES
    ('Administrador', 'Configuración y administración general del sistema.', TRUE),
    ('Médico', 'Atención médica, expediente general y prescripciones.', TRUE),
    ('Psicólogo', 'Agenda y expediente psicológico restringido.', TRUE),
    ('Recepcionista', 'Pacientes, agenda y cobros sin acceso a notas clínicas.', TRUE),
    ('Laboratorista', 'Órdenes, procesamiento y resultados de laboratorio.', TRUE)
ON CONFLICT (nombre_rol) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    estado = EXCLUDED.estado;

-- Especialidades -------------------------------------------------------------

INSERT INTO tb_especialidades (nombre, descripcion, estado)
SELECT v.nombre, v.descripcion, TRUE
FROM (VALUES
    ('Ginecología y Obstetricia', 'Atención integral de la salud femenina, embarazo y parto.'),
    ('Psiquiatría', 'Evaluación, diagnóstico y seguimiento de la salud mental.'),
    ('Radiología y Terapia Neural', 'Diagnóstico por imagen y procedimientos de terapia neural.'),
    ('Quiropraxia', 'Evaluación y tratamiento manual del sistema musculoesquelético.'),
    ('Medicina Biológica Integrativa', 'Medicina integrativa, terapia neural y homeopatía.'),
    ('Psicología y Terapia de Lenguaje', 'Atención psicológica y terapia del lenguaje.'),
    ('Nutrición', 'Evaluación y acompañamiento nutricional.'),
    ('Acupuntura', 'Terapia de acupuntura.'),
    ('Fisioterapia', 'Rehabilitación y recuperación funcional.'),
    ('Laboratorio Clínico', 'Procesamiento y análisis de pruebas clínicas.')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1
      FROM tb_especialidades e
     WHERE LOWER(e.nombre) = LOWER(v.nombre)
);

-- Profesionales. DPI, colegiado, teléfono personal, correo y fecha de inicio
-- quedan NULL porque no fueron proporcionados y no deben inventarse.
INSERT INTO tb_medicos (
    nombre,
    dpi,
    colegiado,
    numero_telefono,
    correo,
    estado,
    fecha_inicio,
    especialidad_id
)
SELECT
    v.nombre,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    NULL,
    e.id
FROM (VALUES
    ('Dra. Brenda Montufar', 'Ginecología y Obstetricia'),
    ('Dra. Mónica Mónzon', 'Psiquiatría'),
    ('Dra. Olga Calvillo', 'Radiología y Terapia Neural'),
    ('Tec. Enrique Mes', 'Quiropraxia'),
    ('Dr. Moisés Valdez', 'Medicina Biológica Integrativa'),
    ('Licda. Castañeda', 'Psicología y Terapia de Lenguaje'),
    ('Licda. Carla Martínez', 'Nutrición'),
    ('Tec. Seong Nam Kim', 'Acupuntura'),
    ('Tec. Ovidio Pelaez', 'Fisioterapia'),
    ('Licda. Ligia Juárez', 'Laboratorio Clínico')
) AS v(nombre, especialidad)
JOIN tb_especialidades e
  ON LOWER(e.nombre) = LOWER(v.especialidad)
WHERE NOT EXISTS (
    SELECT 1
      FROM tb_medicos m
     WHERE LOWER(m.nombre) = LOWER(v.nombre)
);

-- Permisos -------------------------------------------------------------------

WITH permisos(nombre_rol, modulo, puede_leer, puede_escribir, puede_borrar) AS (
    VALUES
        ('Administrador', 'seguridad', TRUE, TRUE, FALSE),
        ('Administrador', 'pacientes', TRUE, TRUE, FALSE),
        ('Administrador', 'agenda', TRUE, TRUE, FALSE),
        ('Administrador', 'expediente_general', TRUE, TRUE, FALSE),
        ('Administrador', 'expediente_psicologia', TRUE, TRUE, FALSE),
        ('Administrador', 'recetas', TRUE, TRUE, FALSE),
        ('Administrador', 'laboratorio', TRUE, TRUE, FALSE),
        ('Administrador', 'facturacion', TRUE, TRUE, FALSE),
        ('Administrador', 'inventario', TRUE, TRUE, FALSE),
        ('Administrador', 'archivos_estudios', TRUE, TRUE, FALSE),
        ('Administrador', 'consentimientos', TRUE, TRUE, FALSE),
        ('Médico', 'pacientes', TRUE, TRUE, FALSE),
        ('Médico', 'agenda', TRUE, TRUE, FALSE),
        ('Médico', 'expediente_general', TRUE, TRUE, FALSE),
        ('Médico', 'recetas', TRUE, TRUE, FALSE),
        ('Médico', 'laboratorio', TRUE, FALSE, FALSE),
        ('Médico', 'archivos_estudios', TRUE, TRUE, FALSE),
        ('Médico', 'consentimientos', TRUE, TRUE, FALSE),
        ('Psicólogo', 'pacientes', TRUE, FALSE, FALSE),
        ('Psicólogo', 'agenda', TRUE, TRUE, FALSE),
        ('Psicólogo', 'expediente_psicologia', TRUE, TRUE, FALSE),
        ('Psicólogo', 'archivos_estudios', TRUE, TRUE, FALSE),
        ('Psicólogo', 'consentimientos', TRUE, TRUE, FALSE),
        ('Recepcionista', 'pacientes', TRUE, TRUE, FALSE),
        ('Recepcionista', 'agenda', TRUE, TRUE, FALSE),
        ('Recepcionista', 'facturacion', TRUE, TRUE, FALSE),
        ('Laboratorista', 'pacientes', TRUE, FALSE, FALSE),
        ('Laboratorista', 'laboratorio', TRUE, TRUE, FALSE),
        ('Laboratorista', 'archivos_estudios', TRUE, TRUE, FALSE)
)
INSERT INTO tb_permisos_rol (
    id_rol,
    modulo,
    puede_leer,
    puede_escribir,
    puede_borrar
)
SELECT r.id_rol, p.modulo, p.puede_leer, p.puede_escribir, p.puede_borrar
FROM permisos p
JOIN tb_roles r ON r.nombre_rol = p.nombre_rol
ON CONFLICT (id_rol, modulo) DO UPDATE
SET puede_leer = EXCLUDED.puede_leer,
    puede_escribir = EXCLUDED.puede_escribir,
    puede_borrar = EXCLUDED.puede_borrar;

-- Usuarios -------------------------------------------------------------------

INSERT INTO tb_usuarios (
    username, nombre, correo, password_hash, id_rol, id_doctor, estado,
    debe_cambiar_password
)
SELECT
    'admin_ami',
    'Administrador A.M.I.',
    NULL,
    crypt('AmiAzul#27', gen_salt('bf', 12)),
    r.id_rol,
    NULL,
    TRUE,
    TRUE
FROM tb_roles r
WHERE r.nombre_rol = 'Administrador'
ON CONFLICT (username) DO NOTHING;

INSERT INTO tb_usuarios (
    username, nombre, correo, password_hash, id_rol, id_doctor, estado,
    debe_cambiar_password
)
SELECT
    'moises',
    'Dr. Moisés Valdez',
    NULL,
    crypt('MoisesSalud#27', gen_salt('bf', 12)),
    r.id_rol,
    m.id,
    TRUE,
    TRUE
FROM tb_roles r
JOIN tb_medicos m ON LOWER(m.nombre) = LOWER('Dr. Moisés Valdez')
WHERE r.nombre_rol = 'Médico'
ON CONFLICT (username) DO NOTHING;

-- Vincula una cuenta preexistente de Moisés sin restablecer su contraseña.
UPDATE tb_usuarios u
   SET nombre = 'Dr. Moisés Valdez',
       id_doctor = m.id,
       id_rol = r.id_rol
  FROM tb_medicos m
 CROSS JOIN tb_roles r
 WHERE LOWER(u.username) = 'moises'
   AND LOWER(m.nombre) = LOWER('Dr. Moisés Valdez')
   AND r.nombre_rol = 'Médico';

-- Catálogos y configuración pública -----------------------------------------

INSERT INTO tb_contacto (
    nombre_empresa, nombre_corto, telefono, correo, facebook, instagram,
    logo_url, ubicacion, google_maps_url, video_inicio_url, slogan,
    horario_semana, horario_sabado, estado
)
SELECT
    'Alternativa Médica Integral A.M.I.',
    'Clínica A.M.I.',
    '5413-3082',
    NULL,
    'https://facebook.com/clinicaintegralami',
    NULL,
    '/MEDIA/LOGgb.png',
    '9a. avenida 2-36, zona 3, Cobán, Alta Verapaz, Guatemala',
    NULL,
    NULL,
    'Atención integral para tu salud y bienestar.',
    'Lunes a sábado, previa cita.',
    'Previa cita.',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM tb_contacto WHERE estado = TRUE);

INSERT INTO tb_servicios (nombre, descripcion, precio, imagen_url, estado)
SELECT
    'Consulta de Medicina Biológica Integrativa',
    'Consulta integral; registro inicial de demostración.',
    0,
    NULL,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM tb_servicios
    WHERE LOWER(nombre) = LOWER('Consulta de Medicina Biológica Integrativa')
);

INSERT INTO tb_medicamentos (
    nombre_comercial, principio_activo, presentacion, concentracion, estado
)
SELECT 'Acetaminofén', 'Paracetamol', 'Tabletas', '500 mg', TRUE
WHERE NOT EXISTS (
    SELECT 1
      FROM tb_medicamentos
     WHERE LOWER(nombre_comercial) = LOWER('Acetaminofén')
       AND LOWER(principio_activo) = LOWER('Paracetamol')
       AND LOWER(presentacion) = LOWER('Tabletas')
       AND LOWER(concentracion) = LOWER('500 mg')
);

INSERT INTO tb_catalogo_examenes (
    nombre, categoria, valores_referencia, unidad_medida, estado
)
SELECT
    'Glucosa en ayunas',
    'Química Sanguínea',
    '70 - 99 mg/dL',
    'mg/dL',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
      FROM tb_catalogo_examenes
     WHERE LOWER(nombre) = LOWER('Glucosa en ayunas')
       AND LOWER(categoria) = LOWER('Química Sanguínea')
);

INSERT INTO tb_proveedores (
    nombre_empresa, contacto, telefono, correo, direccion, estado
)
SELECT
    'Proveedor de demostración A.M.I.',
    'Contacto de demostración',
    '0000-0000',
    'proveedor.demo@example.invalid',
    'Dirección pendiente',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM tb_proveedores
    WHERE LOWER(nombre_empresa) = LOWER('Proveedor de demostración A.M.I.')
);

INSERT INTO tb_estilos (
    nombre, color_fondo, color_texto, icono, estado
)
VALUES ('Institucional A.M.I.', '#003b79', '#ffffff', 'info', TRUE)
ON CONFLICT (nombre) DO UPDATE
SET color_fondo = EXCLUDED.color_fondo,
    color_texto = EXCLUDED.color_texto,
    icono = EXCLUDED.icono,
    estado = EXCLUDED.estado;

INSERT INTO tb_galeria (titulo, definicion, imagen_url, estado)
SELECT
    'Identidad de Clínica A.M.I.',
    'Imagen institucional inicial.',
    '/MEDIA/LOGO.jpg',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM tb_galeria
    WHERE titulo = 'Identidad de Clínica A.M.I.'
);

INSERT INTO tb_promociones (
    titulo, descripcion, fecha_inicio, fecha_fin, imagen_url, estado
)
SELECT
    'Promoción de demostración',
    'Registro inactivo para validar el módulo antes de publicar promociones reales.',
    CURRENT_DATE,
    CURRENT_DATE + 30,
    '/MEDIA/INFO.jpeg',
    FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM tb_promociones
    WHERE titulo = 'Promoción de demostración'
);

INSERT INTO tb_anuncios (
    titulo, descripcion, estilo_id, fecha_inicio, fecha_fin, imagen_url,
    estado, promocion_id
)
SELECT
    'Anuncio de demostración',
    'Registro inactivo para pruebas del módulo de anuncios.',
    e.id,
    CURRENT_DATE,
    CURRENT_DATE + 30,
    '/MEDIA/INFO.jpeg',
    FALSE,
    p.id
FROM tb_estilos e
JOIN tb_promociones p ON p.titulo = 'Promoción de demostración'
WHERE e.nombre = 'Institucional A.M.I.'
  AND NOT EXISTS (
      SELECT 1 FROM tb_anuncios WHERE titulo = 'Anuncio de demostración'
  );

-- Datos clínicos de demostración --------------------------------------------

INSERT INTO tb_pacientes (
    nombres, apellidos, fecha_nacimiento, genero, telefono, email, tipo_sangre,
    antecedentes_personales, estado
)
SELECT
    'Paciente',
    'Demostración',
    DATE '1990-01-01',
    'No especificado',
    '0000-0000',
    'paciente.demo@example.invalid',
    'O+',
    'Registro ficticio para validación; no corresponde a una persona real.',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM tb_pacientes
    WHERE LOWER(email) = LOWER('paciente.demo@example.invalid')
);

INSERT INTO tb_clinicas (
    numero_clinica, sala, id_doctor, estado, horario
)
SELECT
    '1',
    'Consultorio 1',
    m.id,
    TRUE,
    'Lunes a sábado, previa cita.'
FROM tb_medicos m
WHERE LOWER(m.nombre) = LOWER('Dr. Moisés Valdez')
ON CONFLICT (numero_clinica) DO UPDATE
SET sala = EXCLUDED.sala,
    id_doctor = EXCLUDED.id_doctor,
    estado = EXCLUDED.estado,
    horario = EXCLUDED.horario;

INSERT INTO tb_citas (
    id_paciente, id_doctor, id_clinica, fecha_hora, motivo_cita, estado
)
SELECT
    p.id_paciente,
    m.id,
    cl.id_clinica,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'Consulta clínica de demostración',
    'completada'
FROM tb_pacientes p
JOIN tb_medicos m ON LOWER(m.nombre) = LOWER('Dr. Moisés Valdez')
JOIN tb_clinicas cl ON cl.id_doctor = m.id AND cl.estado = TRUE
WHERE LOWER(p.email) = LOWER('paciente.demo@example.invalid')
  AND NOT EXISTS (
      SELECT 1
        FROM tb_citas c
       WHERE c.id_paciente = p.id_paciente
         AND c.id_doctor = m.id
         AND c.motivo_cita = 'Consulta clínica de demostración'
  );

INSERT INTO tb_consultas (
    id_cita, motivo_consulta, notas_evolucion, diagnostico_cie10, tipo_expediente
)
SELECT
    c.id_cita,
    'Consulta de demostración',
    'Notas ficticias para validar el expediente clínico.',
    'Z00.0',
    'general'
FROM tb_citas c
WHERE c.motivo_cita = 'Consulta clínica de demostración'
  AND NOT EXISTS (
      SELECT 1 FROM tb_consultas x WHERE x.id_cita = c.id_cita
  );

INSERT INTO tb_signos_vitales_medidas (
    id_consulta, peso_kg, estatura_cm, presion_arterial,
    frecuencia_cardiaca, temperatura
)
SELECT x.id_consulta, 70.00, 170.00, '120/80', 72, 36.5
FROM tb_consultas x
JOIN tb_citas c ON c.id_cita = x.id_cita
WHERE c.motivo_cita = 'Consulta clínica de demostración'
  AND NOT EXISTS (
      SELECT 1 FROM tb_signos_vitales_medidas s
      WHERE s.id_consulta = x.id_consulta
  );

INSERT INTO tb_recetas (
    id_doctor, id_paciente, fecha_emision, diagnostico
)
SELECT
    m.id,
    p.id_paciente,
    CURRENT_TIMESTAMP,
    'Prescripción de demostración; no utilizar como indicación médica.'
FROM tb_medicos m
JOIN tb_pacientes p
  ON LOWER(p.email) = LOWER('paciente.demo@example.invalid')
WHERE LOWER(m.nombre) = LOWER('Dr. Moisés Valdez')
  AND NOT EXISTS (
      SELECT 1
        FROM tb_recetas r
       WHERE r.id_doctor = m.id
         AND r.id_paciente = p.id_paciente
         AND r.diagnostico = 'Prescripción de demostración; no utilizar como indicación médica.'
  );

INSERT INTO tb_detalle_receta (
    id_receta, id_medicamento, dosis, duracion_dias
)
SELECT
    r.id_receta,
    m.id_medicamento,
    'Dato de demostración; no constituye indicación médica',
    1
FROM tb_recetas r
JOIN tb_medicamentos m
  ON LOWER(m.nombre_comercial) = LOWER('Acetaminofén')
WHERE r.diagnostico = 'Prescripción de demostración; no utilizar como indicación médica.'
  AND NOT EXISTS (
      SELECT 1
        FROM tb_detalle_receta d
       WHERE d.id_receta = r.id_receta
         AND d.id_medicamento = m.id_medicamento
  );

INSERT INTO tb_consulta_servicios (
    id_consulta, id_servicio, observaciones_procedimiento
)
SELECT
    x.id_consulta,
    s.id,
    'Procedimiento de demostración.'
FROM tb_consultas x
JOIN tb_citas c ON c.id_cita = x.id_cita
JOIN tb_servicios s
  ON LOWER(s.nombre) = LOWER('Consulta de Medicina Biológica Integrativa')
WHERE c.motivo_cita = 'Consulta clínica de demostración'
  AND NOT EXISTS (
      SELECT 1
        FROM tb_consulta_servicios cs
       WHERE cs.id_consulta = x.id_consulta
         AND cs.id_servicio = s.id
  );

INSERT INTO tb_ordenes_laboratorio (
    id_paciente, id_doctor, fecha_orden, estado
)
SELECT p.id_paciente, m.id, CURRENT_TIMESTAMP, 'finalizado'
FROM tb_pacientes p
JOIN tb_medicos m ON LOWER(m.nombre) = LOWER('Dr. Moisés Valdez')
WHERE LOWER(p.email) = LOWER('paciente.demo@example.invalid')
  AND NOT EXISTS (
      SELECT 1 FROM tb_ordenes_laboratorio o
      WHERE o.id_paciente = p.id_paciente AND o.id_doctor = m.id
  );

INSERT INTO tb_resultados_laboratorio (
    id_orden, id_examen, valor_obtenido, observaciones, fecha_resultado
)
SELECT
    o.id_orden,
    e.id_examen,
    '90',
    'Resultado ficticio de demostración.',
    CURRENT_TIMESTAMP
FROM tb_ordenes_laboratorio o
JOIN tb_pacientes p ON p.id_paciente = o.id_paciente
JOIN tb_catalogo_examenes e
  ON LOWER(e.nombre) = LOWER('Glucosa en ayunas')
WHERE LOWER(p.email) = LOWER('paciente.demo@example.invalid')
  AND NOT EXISTS (
      SELECT 1
        FROM tb_resultados_laboratorio r
       WHERE r.id_orden = o.id_orden AND r.id_examen = e.id_examen
  );

-- Facturación e inventario de demostración ----------------------------------

INSERT INTO tb_facturas (
    id_paciente, id_usuario, fecha_emision, total, metodo_pago, estado,
    observaciones
)
SELECT
    p.id_paciente,
    u.id_usuario,
    CURRENT_TIMESTAMP,
    0,
    'efectivo',
    'pagada',
    'Factura de demostración inicial.'
FROM tb_pacientes p
JOIN tb_usuarios u ON LOWER(u.username) = 'admin_ami'
WHERE LOWER(p.email) = LOWER('paciente.demo@example.invalid')
  AND NOT EXISTS (
      SELECT 1 FROM tb_facturas f
      WHERE f.observaciones = 'Factura de demostración inicial.'
  );

INSERT INTO tb_detalle_factura (
    id_factura, concepto, cantidad, precio_unitario, estado
)
SELECT
    f.id_factura,
    'Consulta de Medicina Biológica Integrativa',
    1,
    0,
    TRUE
FROM tb_facturas f
WHERE f.observaciones = 'Factura de demostración inicial.'
  AND NOT EXISTS (
      SELECT 1 FROM tb_detalle_factura d
      WHERE d.id_factura = f.id_factura
        AND d.concepto = 'Consulta de Medicina Biológica Integrativa'
  );

INSERT INTO tb_insumos_inventario (
    nombre, tipo, id_proveedor, id_medicamento, stock_actual, stock_minimo,
    precio_costo, unidad_medida, estado
)
SELECT
    'Acetaminofén 500 mg - demostración',
    'medicamento',
    p.id_proveedor,
    m.id_medicamento,
    0,
    10,
    0,
    'tableta',
    TRUE
FROM tb_proveedores p
JOIN tb_medicamentos m
  ON LOWER(m.nombre_comercial) = LOWER('Acetaminofén')
WHERE LOWER(p.nombre_empresa) = LOWER('Proveedor de demostración A.M.I.')
  AND NOT EXISTS (
      SELECT 1 FROM tb_insumos_inventario i
      WHERE LOWER(i.nombre) = LOWER('Acetaminofén 500 mg - demostración')
        AND i.tipo = 'medicamento'
  );

INSERT INTO tb_movimientos_inventario (
    id_insumo, tipo_movimiento, cantidad, fecha, id_usuario, observaciones
)
SELECT
    i.id_insumo,
    'entrada',
    100,
    CURRENT_TIMESTAMP,
    u.id_usuario,
    'Carga inicial de inventario de demostración.'
FROM tb_insumos_inventario i
JOIN tb_usuarios u ON LOWER(u.username) = 'admin_ami'
WHERE LOWER(i.nombre) = LOWER('Acetaminofén 500 mg - demostración')
  AND NOT EXISTS (
      SELECT 1 FROM tb_movimientos_inventario m
      WHERE m.id_insumo = i.id_insumo
        AND m.observaciones = 'Carga inicial de inventario de demostración.'
  );

-- Estudios y consentimiento de demostración ---------------------------------

INSERT INTO tb_archivos_estudios (
    id_paciente, id_consulta, tipo_estudio, ruta_archivo, fecha_subida,
    id_usuario, descripcion, estado
)
SELECT
    p.id_paciente,
    x.id_consulta,
    'PDF de Laboratorio Externo',
    '/uploads/demo/estudio-ejemplo.pdf',
    CURRENT_TIMESTAMP,
    u.id_usuario,
    'Ruta ficticia para validar el módulo de archivos.',
    TRUE
FROM tb_pacientes p
JOIN tb_citas c ON c.id_paciente = p.id_paciente
JOIN tb_consultas x ON x.id_cita = c.id_cita
JOIN tb_usuarios u ON LOWER(u.username) = 'admin_ami'
WHERE LOWER(p.email) = LOWER('paciente.demo@example.invalid')
  AND c.motivo_cita = 'Consulta clínica de demostración'
  AND NOT EXISTS (
      SELECT 1 FROM tb_archivos_estudios a
      WHERE a.ruta_archivo = '/uploads/demo/estudio-ejemplo.pdf'
  );

INSERT INTO tb_consentimientos_informados (
    id_paciente, id_servicio, fecha_firma, estado_firma, ruta_documento,
    id_usuario, observaciones
)
SELECT
    p.id_paciente,
    s.id,
    NULL,
    'pendiente',
    NULL,
    u.id_usuario,
    'Consentimiento de demostración pendiente de firma.'
FROM tb_pacientes p
JOIN tb_servicios s
  ON LOWER(s.nombre) = LOWER('Consulta de Medicina Biológica Integrativa')
JOIN tb_usuarios u ON LOWER(u.username) = 'admin_ami'
WHERE LOWER(p.email) = LOWER('paciente.demo@example.invalid')
  AND NOT EXISTS (
      SELECT 1 FROM tb_consentimientos_informados c
      WHERE c.id_paciente = p.id_paciente
        AND c.id_servicio = s.id
        AND c.observaciones = 'Consentimiento de demostración pendiente de firma.'
  );

COMMIT;
