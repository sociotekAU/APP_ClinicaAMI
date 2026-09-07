BEGIN;

-- Catálogo de especialidades médicas de Alternativa Médica Integral A.M.I.
CREATE TABLE IF NOT EXISTS tb_especialidades (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Evita nombres duplicados aunque cambien las mayúsculas o minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_especialidades_nombre
    ON tb_especialidades (LOWER(nombre));

-- Profesionales médicos; cada médico pertenece a una especialidad.
CREATE TABLE IF NOT EXISTS tb_medicos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    dpi VARCHAR(13) NOT NULL,
    colegiado VARCHAR(50),
    numero_telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_inicio DATE NOT NULL,
    especialidad_id INTEGER NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tb_medicos_dpi UNIQUE (dpi),
    CONSTRAINT ck_tb_medicos_dpi_formato CHECK (dpi ~ '^[0-9]{13}$'),
    CONSTRAINT fk_tb_medicos_especialidad
        FOREIGN KEY (especialidad_id)
        REFERENCES tb_especialidades (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Evita correos duplicados aunque cambien las mayúsculas o minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_medicos_correo
    ON tb_medicos (LOWER(correo));

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_medicos_colegiado
    ON tb_medicos (LOWER(colegiado))
    WHERE colegiado IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tb_medicos_especialidad_id
    ON tb_medicos (especialidad_id);

CREATE INDEX IF NOT EXISTS ix_tb_medicos_estado
    ON tb_medicos (estado);

-- Normaliza los datos y valida las reglas relacionadas con la especialidad.
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

DROP TRIGGER IF EXISTS trg_validar_medico ON tb_medicos;
CREATE TRIGGER trg_validar_medico
BEFORE INSERT OR UPDATE ON tb_medicos
FOR EACH ROW
EXECUTE FUNCTION fn_validar_medico();

-- Mantiene la consistencia: al desactivar una especialidad, también se
-- desactivan sus médicos. Los registros se conservan como historial.
CREATE OR REPLACE FUNCTION fn_desactivar_medicos_por_especialidad()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.estado = TRUE AND NEW.estado = FALSE THEN
        UPDATE tb_medicos
           SET estado = FALSE
         WHERE especialidad_id = NEW.id
           AND estado = TRUE;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_desactivar_medicos_por_especialidad
    ON tb_especialidades;
CREATE TRIGGER trg_desactivar_medicos_por_especialidad
AFTER UPDATE OF estado ON tb_especialidades
FOR EACH ROW
EXECUTE FUNCTION fn_desactivar_medicos_por_especialidad();

COMMENT ON TABLE tb_especialidades IS
    'Catálogo de especialidades médicas de Alternativa Médica Integral A.M.I.';
COMMENT ON COLUMN tb_especialidades.estado IS
    'TRUE si la especialidad está activa; FALSE si está inactiva.';
COMMENT ON TABLE tb_medicos IS
    'Profesionales médicos vinculados a una especialidad.';
COMMENT ON COLUMN tb_medicos.dpi IS
    'Documento Personal de Identificación de Guatemala, compuesto por 13 dígitos.';
COMMENT ON COLUMN tb_medicos.colegiado IS
    'Número único de colegiado o licencia profesional del médico.';
COMMENT ON COLUMN tb_medicos.especialidad_id IS
    'Especialidad médica asignada al profesional.';

COMMIT;
