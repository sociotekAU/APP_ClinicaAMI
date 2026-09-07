BEGIN;

-- Compatibilidad para instalaciones donde tb_medicos ya fue creada.
ALTER TABLE tb_medicos
    ADD COLUMN IF NOT EXISTS colegiado VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_medicos_colegiado
    ON tb_medicos (LOWER(colegiado))
    WHERE colegiado IS NOT NULL;

COMMENT ON COLUMN tb_medicos.colegiado IS
    'Número único de colegiado o licencia profesional del médico.';

-- Actualiza también la función de instalaciones que ya tenían tb_medicos.
CREATE OR REPLACE FUNCTION fn_validar_medico()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    especialidad_activa BOOLEAN;
BEGIN
    NEW.nombre := TRIM(NEW.nombre);
    NEW.dpi := TRIM(NEW.dpi);
    NEW.colegiado := NULLIF(TRIM(NEW.colegiado), '');
    NEW.numero_telefono := TRIM(NEW.numero_telefono);
    NEW.correo := LOWER(TRIM(NEW.correo));

    IF NEW.nombre = '' THEN
        RAISE EXCEPTION 'El nombre del médico es obligatorio.';
    END IF;

    IF NEW.numero_telefono = '' THEN
        RAISE EXCEPTION 'El número de teléfono es obligatorio.';
    END IF;

    IF NEW.correo = '' THEN
        RAISE EXCEPTION 'El correo del médico es obligatorio.';
    END IF;

    IF NEW.fecha_inicio > CURRENT_DATE THEN
        RAISE EXCEPTION 'La fecha de inicio no puede ser posterior a la fecha actual.';
    END IF;

    IF NEW.estado THEN
        SELECT estado
          INTO especialidad_activa
          FROM tb_especialidades
         WHERE id = NEW.especialidad_id;

        IF especialidad_activa IS NULL THEN
            RAISE EXCEPTION 'La especialidad indicada no existe.';
        END IF;

        IF NOT especialidad_activa THEN
            RAISE EXCEPTION 'No se puede asignar o reactivar un médico en una especialidad inactiva.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Núcleo de pacientes.
CREATE TABLE IF NOT EXISTS tb_pacientes (
    id_paciente INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(30),
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    tipo_sangre VARCHAR(5),
    antecedentes_personales TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_pacientes_email
    ON tb_pacientes (LOWER(email))
    WHERE email IS NOT NULL;

-- Consultorios físicos de la clínica.
CREATE TABLE IF NOT EXISTS tb_clinicas (
    id_clinica INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_clinica VARCHAR(30) NOT NULL UNIQUE,
    sala VARCHAR(100) NOT NULL,
    id_doctor INTEGER NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    horario TEXT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_clinicas_doctor
        FOREIGN KEY (id_doctor)
        REFERENCES tb_medicos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_tb_clinicas_doctor
    ON tb_clinicas (id_doctor);

-- Agenda de citas.
CREATE TABLE IF NOT EXISTS tb_citas (
    id_cita INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente INTEGER NOT NULL,
    id_doctor INTEGER NOT NULL,
    fecha_hora TIMESTAMP NOT NULL,
    motivo_cita VARCHAR(255) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'programada',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_citas_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES tb_pacientes (id_paciente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_citas_doctor
        FOREIGN KEY (id_doctor)
        REFERENCES tb_medicos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_citas_estado
        CHECK (estado IN ('programada', 'completada', 'cancelada', 'no_asistio')),
    CONSTRAINT uq_tb_citas_doctor_fecha UNIQUE (id_doctor, fecha_hora),
    CONSTRAINT uq_tb_citas_paciente_fecha UNIQUE (id_paciente, fecha_hora)
);

CREATE INDEX IF NOT EXISTS ix_tb_citas_fecha_hora
    ON tb_citas (fecha_hora);
CREATE INDEX IF NOT EXISTS ix_tb_citas_estado
    ON tb_citas (estado);

-- Registro clínico por sesión o evolución.
CREATE TABLE IF NOT EXISTS tb_consultas (
    id_consulta INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cita INTEGER NOT NULL UNIQUE,
    motivo_consulta TEXT NOT NULL,
    notas_evolucion TEXT,
    diagnostico_cie10 VARCHAR(20),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_consultas_cita
        FOREIGN KEY (id_cita)
        REFERENCES tb_citas (id_cita)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Mediciones asociadas a una consulta. El IMC se calcula automáticamente.
CREATE TABLE IF NOT EXISTS tb_signos_vitales_medidas (
    id_medicion INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_consulta INTEGER NOT NULL,
    peso_kg NUMERIC(6,2),
    estatura_cm NUMERIC(6,2),
    presion_arterial VARCHAR(20),
    frecuencia_cardiaca SMALLINT,
    temperatura NUMERIC(4,1),
    imc NUMERIC(6,2) GENERATED ALWAYS AS (
        CASE
            WHEN peso_kg IS NOT NULL AND estatura_cm > 0
                THEN ROUND(
                    peso_kg / ((estatura_cm / 100.0) * (estatura_cm / 100.0)),
                    2
                )
            ELSE NULL
        END
    ) STORED,
    fecha_medicion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_signos_consulta
        FOREIGN KEY (id_consulta)
        REFERENCES tb_consultas (id_consulta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_signos_peso CHECK (peso_kg IS NULL OR peso_kg > 0),
    CONSTRAINT ck_tb_signos_estatura CHECK (estatura_cm IS NULL OR estatura_cm > 0),
    CONSTRAINT ck_tb_signos_frecuencia
        CHECK (frecuencia_cardiaca IS NULL OR frecuencia_cardiaca > 0),
    CONSTRAINT ck_tb_signos_temperatura
        CHECK (temperatura IS NULL OR temperatura BETWEEN 25 AND 50)
);

CREATE INDEX IF NOT EXISTS ix_tb_signos_consulta
    ON tb_signos_vitales_medidas (id_consulta);

-- Catálogo de medicamentos.
CREATE TABLE IF NOT EXISTS tb_medicamentos (
    id_medicamento INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_comercial VARCHAR(150) NOT NULL,
    principio_activo VARCHAR(150) NOT NULL,
    presentacion VARCHAR(50) NOT NULL,
    concentracion VARCHAR(50) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_medicamentos_identidad
    ON tb_medicamentos (
        LOWER(nombre_comercial),
        LOWER(principio_activo),
        LOWER(presentacion),
        LOWER(concentracion)
    );

-- Encabezado de la receta médica.
CREATE TABLE IF NOT EXISTS tb_recetas (
    id_receta INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_doctor INTEGER NOT NULL,
    id_paciente INTEGER NOT NULL,
    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diagnostico TEXT NOT NULL,
    CONSTRAINT fk_tb_recetas_doctor
        FOREIGN KEY (id_doctor)
        REFERENCES tb_medicos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_recetas_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES tb_pacientes (id_paciente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_tb_recetas_doctor
    ON tb_recetas (id_doctor);
CREATE INDEX IF NOT EXISTS ix_tb_recetas_paciente
    ON tb_recetas (id_paciente);

-- Relación M:N entre recetas y medicamentos.
CREATE TABLE IF NOT EXISTS tb_detalle_receta (
    id_detalle INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_receta INTEGER NOT NULL,
    id_medicamento INTEGER NOT NULL,
    dosis VARCHAR(100) NOT NULL,
    duracion_dias INTEGER NOT NULL,
    CONSTRAINT fk_tb_detalle_receta
        FOREIGN KEY (id_receta)
        REFERENCES tb_recetas (id_receta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_detalle_medicamento
        FOREIGN KEY (id_medicamento)
        REFERENCES tb_medicamentos (id_medicamento)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_detalle_duracion CHECK (duracion_dias > 0),
    CONSTRAINT uq_tb_detalle_receta_medicamento
        UNIQUE (id_receta, id_medicamento)
);

CREATE INDEX IF NOT EXISTS ix_tb_detalle_receta_medicamento
    ON tb_detalle_receta (id_medicamento);

-- tb_servicios funciona como catálogo clínico y como contenido público.
CREATE TABLE IF NOT EXISTS tb_servicios (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL DEFAULT 0,
    imagen_url VARCHAR(255),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_tb_servicios_precio CHECK (precio >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_servicios_nombre
    ON tb_servicios (LOWER(nombre));

CREATE TABLE IF NOT EXISTS tb_consulta_servicios (
    id_detalle INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_consulta INTEGER NOT NULL,
    id_servicio INTEGER NOT NULL,
    observaciones_procedimiento TEXT,
    CONSTRAINT fk_tb_consulta_servicios_consulta
        FOREIGN KEY (id_consulta)
        REFERENCES tb_consultas (id_consulta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_consulta_servicios_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES tb_servicios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_tb_consulta_servicios_consulta
    ON tb_consulta_servicios (id_consulta);
CREATE INDEX IF NOT EXISTS ix_tb_consulta_servicios_servicio
    ON tb_consulta_servicios (id_servicio);

-- Catálogo de pruebas de laboratorio.
CREATE TABLE IF NOT EXISTS tb_catalogo_examenes (
    id_examen INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    valores_referencia VARCHAR(255),
    unidad_medida VARCHAR(50),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_examenes_nombre_categoria
    ON tb_catalogo_examenes (LOWER(nombre), LOWER(categoria));

-- Solicitudes internas o externas de laboratorio.
CREATE TABLE IF NOT EXISTS tb_ordenes_laboratorio (
    id_orden INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente INTEGER NOT NULL,
    id_doctor INTEGER,
    fecha_orden TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CONSTRAINT fk_tb_ordenes_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES tb_pacientes (id_paciente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_ordenes_doctor
        FOREIGN KEY (id_doctor)
        REFERENCES tb_medicos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_ordenes_estado
        CHECK (estado IN ('pendiente', 'procesando', 'finalizado'))
);

CREATE INDEX IF NOT EXISTS ix_tb_ordenes_paciente
    ON tb_ordenes_laboratorio (id_paciente);
CREATE INDEX IF NOT EXISTS ix_tb_ordenes_doctor
    ON tb_ordenes_laboratorio (id_doctor);
CREATE INDEX IF NOT EXISTS ix_tb_ordenes_estado
    ON tb_ordenes_laboratorio (estado);

-- Una fila por cada examen incluido en una orden.
CREATE TABLE IF NOT EXISTS tb_resultados_laboratorio (
    id_resultado INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_orden INTEGER NOT NULL,
    id_examen INTEGER NOT NULL,
    valor_obtenido VARCHAR(255),
    observaciones TEXT,
    fecha_resultado TIMESTAMP,
    CONSTRAINT fk_tb_resultados_orden
        FOREIGN KEY (id_orden)
        REFERENCES tb_ordenes_laboratorio (id_orden)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_resultados_examen
        FOREIGN KEY (id_examen)
        REFERENCES tb_catalogo_examenes (id_examen)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_tb_resultados_orden_examen UNIQUE (id_orden, id_examen)
);

CREATE INDEX IF NOT EXISTS ix_tb_resultados_orden
    ON tb_resultados_laboratorio (id_orden);
CREATE INDEX IF NOT EXISTS ix_tb_resultados_examen
    ON tb_resultados_laboratorio (id_examen);

COMMENT ON TABLE tb_pacientes IS
    'Expediente base e información general de pacientes.';
COMMENT ON TABLE tb_clinicas IS
    'Consultorios físicos con sala, médico asociado y horario.';
COMMENT ON TABLE tb_citas IS
    'Agenda clínica de pacientes y médicos.';
COMMENT ON TABLE tb_consultas IS
    'Sesiones clínicas y notas de evolución vinculadas a una cita.';
COMMENT ON TABLE tb_signos_vitales_medidas IS
    'Signos vitales y medidas antropométricas de una consulta.';
COMMENT ON TABLE tb_medicamentos IS
    'Catálogo de medicamentos disponibles para prescripción.';
COMMENT ON TABLE tb_recetas IS
    'Encabezado de prescripción emitida por un médico a un paciente.';
COMMENT ON TABLE tb_detalle_receta IS
    'Medicamentos, dosis y duración incluidos en una receta.';
COMMENT ON TABLE tb_consulta_servicios IS
    'Terapias o procedimientos realizados durante una consulta.';
COMMENT ON TABLE tb_catalogo_examenes IS
    'Pruebas disponibles en el laboratorio clínico.';
COMMENT ON TABLE tb_ordenes_laboratorio IS
    'Orden de laboratorio interna o externa para un paciente.';
COMMENT ON TABLE tb_resultados_laboratorio IS
    'Resultado de cada examen incluido en una orden de laboratorio.';

COMMIT;
