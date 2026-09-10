-- FASE 5.12 — ARCHIVOS DE ESTUDIOS Y CONSENTIMIENTOS INFORMADOS
-- Fuente de verdad: BD/. Copia operativa: APP_ClinicaAMI/database/migrations/.

BEGIN;

ALTER TABLE tb_archivos_estudios
    ADD COLUMN IF NOT EXISTS nombre_original VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS hash_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS fecha_estado TIMESTAMP,
    ADD COLUMN IF NOT EXISTS motivo_estado TEXT,
    ADD COLUMN IF NOT EXISTS id_usuario_estado INTEGER;

ALTER TABLE tb_archivos_estudios
    DROP CONSTRAINT IF EXISTS fk_tb_archivos_usuario_estado,
    ADD CONSTRAINT fk_tb_archivos_usuario_estado
        FOREIGN KEY (id_usuario_estado)
        REFERENCES tb_usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    DROP CONSTRAINT IF EXISTS ck_tb_archivos_tamano,
    ADD CONSTRAINT ck_tb_archivos_tamano
        CHECK (tamano_bytes IS NULL OR tamano_bytes > 0),
    DROP CONSTRAINT IF EXISTS ck_tb_archivos_hash,
    ADD CONSTRAINT ck_tb_archivos_hash
        CHECK (hash_sha256 IS NULL OR hash_sha256 ~ '^[0-9a-f]{64}$');

ALTER TABLE tb_consentimientos_informados
    ADD COLUMN IF NOT EXISTS nombre_original VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS hash_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS fecha_estado TIMESTAMP,
    ADD COLUMN IF NOT EXISTS motivo_estado TEXT,
    ADD COLUMN IF NOT EXISTS id_usuario_estado INTEGER;

ALTER TABLE tb_consentimientos_informados
    DROP CONSTRAINT IF EXISTS fk_tb_consentimientos_usuario_estado,
    ADD CONSTRAINT fk_tb_consentimientos_usuario_estado
        FOREIGN KEY (id_usuario_estado)
        REFERENCES tb_usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    DROP CONSTRAINT IF EXISTS ck_tb_consentimientos_tamano,
    ADD CONSTRAINT ck_tb_consentimientos_tamano
        CHECK (tamano_bytes IS NULL OR tamano_bytes > 0),
    DROP CONSTRAINT IF EXISTS ck_tb_consentimientos_hash,
    ADD CONSTRAINT ck_tb_consentimientos_hash
        CHECK (hash_sha256 IS NULL OR hash_sha256 ~ '^[0-9a-f]{64}$'),
    DROP CONSTRAINT IF EXISTS ck_tb_consentimientos_fecha,
    ADD CONSTRAINT ck_tb_consentimientos_fecha
        CHECK (estado_firma <> 'firmado' OR (fecha_firma IS NOT NULL AND ruta_documento IS NOT NULL));

CREATE OR REPLACE FUNCTION fn_proteger_archivo_estudio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Los archivos de estudios no se eliminan; deben desactivarse con motivo.';
    END IF;

    IF NEW.id_paciente <> OLD.id_paciente
       OR NEW.id_consulta <> OLD.id_consulta
       OR NEW.ruta_archivo <> OLD.ruta_archivo
       OR NEW.fecha_subida <> OLD.fecha_subida
       OR NEW.id_usuario <> OLD.id_usuario
       OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
       OR NEW.tipo_mime IS DISTINCT FROM OLD.tipo_mime
       OR NEW.tamano_bytes IS DISTINCT FROM OLD.tamano_bytes
       OR NEW.hash_sha256 IS DISTINCT FROM OLD.hash_sha256 THEN
        RAISE EXCEPTION 'El archivo físico y sus relaciones son inmutables.';
    END IF;

    IF OLD.estado = FALSE AND NEW.estado = FALSE AND NEW IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Un archivo inactivo solo puede reactivarse.';
    END IF;

    IF NEW.estado <> OLD.estado THEN
        IF NEW.fecha_estado IS NULL
           OR NEW.id_usuario_estado IS NULL
           OR NULLIF(BTRIM(NEW.motivo_estado), '') IS NULL THEN
            RAISE EXCEPTION 'El cambio de estado requiere fecha, usuario y motivo.';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.estado = TRUE
       AND NEW.estado = TRUE
       AND NEW.fecha_estado IS NOT DISTINCT FROM OLD.fecha_estado
       AND NEW.motivo_estado IS NOT DISTINCT FROM OLD.motivo_estado
       AND NEW.id_usuario_estado IS NOT DISTINCT FROM OLD.id_usuario_estado THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'El cambio solicitado no está permitido para el archivo.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_archivo_estudio ON tb_archivos_estudios;
CREATE TRIGGER trg_proteger_archivo_estudio
BEFORE UPDATE OR DELETE ON tb_archivos_estudios
FOR EACH ROW EXECUTE FUNCTION fn_proteger_archivo_estudio();

CREATE OR REPLACE FUNCTION fn_proteger_consentimiento_informado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Los consentimientos informados no se eliminan.';
    END IF;

    IF OLD.estado_firma IN ('firmado', 'rechazado', 'revocado') THEN
        IF OLD.estado_firma = 'firmado'
           AND NEW.estado_firma = 'revocado'
           AND NEW.id_paciente = OLD.id_paciente
           AND NEW.id_servicio = OLD.id_servicio
           AND NEW.fecha_firma = OLD.fecha_firma
           AND NEW.ruta_documento IS NOT DISTINCT FROM OLD.ruta_documento
           AND NEW.id_usuario IS NOT DISTINCT FROM OLD.id_usuario
           AND NEW.observaciones IS NOT DISTINCT FROM OLD.observaciones
           AND NEW.fecha_creacion = OLD.fecha_creacion
           AND NEW.nombre_original IS NOT DISTINCT FROM OLD.nombre_original
           AND NEW.tipo_mime IS NOT DISTINCT FROM OLD.tipo_mime
           AND NEW.tamano_bytes IS NOT DISTINCT FROM OLD.tamano_bytes
           AND NEW.hash_sha256 IS NOT DISTINCT FROM OLD.hash_sha256
           AND NEW.fecha_estado IS NOT NULL
           AND NEW.id_usuario_estado IS NOT NULL
           AND NULLIF(BTRIM(NEW.motivo_estado), '') IS NOT NULL THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Un consentimiento finalizado es inmutable.';
    END IF;

    IF OLD.estado_firma = 'pendiente' AND NEW.estado_firma = 'pendiente' THEN
        IF NEW.fecha_firma IS NOT NULL
           OR NEW.fecha_estado IS DISTINCT FROM OLD.fecha_estado
           OR NEW.motivo_estado IS DISTINCT FROM OLD.motivo_estado
           OR NEW.id_usuario_estado IS DISTINCT FROM OLD.id_usuario_estado THEN
            RAISE EXCEPTION 'Un consentimiento pendiente no admite datos de finalización.';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.estado_firma = 'pendiente' AND NEW.estado_firma IN ('firmado', 'rechazado') THEN
        IF NEW.id_paciente <> OLD.id_paciente
           OR NEW.id_servicio <> OLD.id_servicio
           OR NEW.ruta_documento IS DISTINCT FROM OLD.ruta_documento
           OR NEW.observaciones IS DISTINCT FROM OLD.observaciones
           OR NEW.fecha_creacion <> OLD.fecha_creacion
           OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
           OR NEW.tipo_mime IS DISTINCT FROM OLD.tipo_mime
           OR NEW.tamano_bytes IS DISTINCT FROM OLD.tamano_bytes
           OR NEW.hash_sha256 IS DISTINCT FROM OLD.hash_sha256
           OR NEW.fecha_estado IS NULL
           OR NEW.id_usuario_estado IS NULL
           OR NULLIF(BTRIM(NEW.motivo_estado), '') IS NULL THEN
            RAISE EXCEPTION 'La finalización requiere conservar el registro e indicar fecha, usuario y motivo.';
        END IF;
        IF NEW.estado_firma = 'firmado' AND (NEW.fecha_firma IS NULL OR NEW.ruta_documento IS NULL) THEN
            RAISE EXCEPTION 'La firma requiere fecha y documento almacenado.';
        END IF;
        IF NEW.estado_firma = 'rechazado' AND NEW.fecha_firma IS NOT NULL THEN
            RAISE EXCEPTION 'Un consentimiento rechazado no puede registrar fecha de firma.';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'La transición de estado del consentimiento no está permitida.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_consentimiento_informado ON tb_consentimientos_informados;
CREATE TRIGGER trg_proteger_consentimiento_informado
BEFORE UPDATE OR DELETE ON tb_consentimientos_informados
FOR EACH ROW EXECUTE FUNCTION fn_proteger_consentimiento_informado();

CREATE INDEX IF NOT EXISTS ix_tb_archivos_estado_fecha_id
    ON tb_archivos_estudios (estado, fecha_subida DESC, id_archivo DESC);
CREATE INDEX IF NOT EXISTS ix_tb_archivos_paciente_fecha_id
    ON tb_archivos_estudios (id_paciente, fecha_subida DESC, id_archivo DESC);
CREATE INDEX IF NOT EXISTS ix_tb_consentimientos_estado_fecha_id
    ON tb_consentimientos_informados (estado_firma, fecha_creacion DESC, id_consentimiento DESC);
CREATE INDEX IF NOT EXISTS ix_tb_consentimientos_paciente_fecha_id
    ON tb_consentimientos_informados (id_paciente, fecha_creacion DESC, id_consentimiento DESC);

COMMENT ON COLUMN tb_archivos_estudios.hash_sha256 IS 'Huella SHA-256 para verificar integridad del archivo privado.';
COMMENT ON COLUMN tb_archivos_estudios.ruta_archivo IS 'Ruta relativa dentro del almacenamiento privado; nunca una URL pública.';
COMMENT ON COLUMN tb_consentimientos_informados.hash_sha256 IS 'Huella SHA-256 del documento informado almacenado de forma privada.';
COMMENT ON COLUMN tb_consentimientos_informados.ruta_documento IS 'Ruta relativa dentro del almacenamiento privado; nunca una URL pública.';

COMMIT;

