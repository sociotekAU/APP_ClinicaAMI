BEGIN;

-- Las recetas emitidas se conservan; cualquier retiro se registra como anulación.
ALTER TABLE tb_recetas
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'emitida',
    ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMP,
    ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'ck_tb_recetas_estado'
           AND conrelid = 'tb_recetas'::regclass
    ) THEN
        ALTER TABLE tb_recetas
            ADD CONSTRAINT ck_tb_recetas_estado
            CHECK (estado IN ('emitida', 'anulada'));
    END IF;
END;
$$;

-- Los procedimientos usan desactivación lógica y fecha propia de registro.
ALTER TABLE tb_consulta_servicios
    ADD COLUMN IF NOT EXISTS estado BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_consulta_servicios_consulta_servicio
    ON tb_consulta_servicios (id_consulta, id_servicio);

-- Seguimiento operativo de las órdenes de laboratorio.
ALTER TABLE tb_ordenes_laboratorio
    ADD COLUMN IF NOT EXISTS observaciones TEXT,
    ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMP;

CREATE OR REPLACE FUNCTION fn_validar_finalizacion_orden_laboratorio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.estado = 'finalizado' AND NEW.estado <> 'finalizado' THEN
        RAISE EXCEPTION 'Una orden finalizada no puede reabrirse.'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.estado = 'finalizado' AND OLD.estado <> 'finalizado' THEN
        IF NOT EXISTS (
            SELECT 1 FROM tb_resultados_laboratorio r
             WHERE r.id_orden = NEW.id_orden
        ) OR EXISTS (
            SELECT 1 FROM tb_resultados_laboratorio r
             WHERE r.id_orden = NEW.id_orden
               AND (NULLIF(BTRIM(r.valor_obtenido), '') IS NULL OR r.fecha_resultado IS NULL)
        ) THEN
            RAISE EXCEPTION 'Todos los exámenes deben tener resultado antes de finalizar la orden.'
                USING ERRCODE = '23514';
        END IF;
        NEW.fecha_finalizacion := COALESCE(NEW.fecha_finalizacion, CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_finalizacion_orden_laboratorio
    ON tb_ordenes_laboratorio;
CREATE TRIGGER trg_validar_finalizacion_orden_laboratorio
BEFORE UPDATE OF estado ON tb_ordenes_laboratorio
FOR EACH ROW
EXECUTE FUNCTION fn_validar_finalizacion_orden_laboratorio();

-- Índices estables para búsquedas y paginación del Paso 5.8.
CREATE INDEX IF NOT EXISTS ix_tb_medicamentos_estado_nombre_id
    ON tb_medicamentos (estado, nombre_comercial, id_medicamento);
CREATE INDEX IF NOT EXISTS ix_tb_recetas_doctor_fecha_id
    ON tb_recetas (id_doctor, fecha_emision DESC, id_receta);
CREATE INDEX IF NOT EXISTS ix_tb_recetas_paciente_fecha_id
    ON tb_recetas (id_paciente, fecha_emision DESC, id_receta);
CREATE INDEX IF NOT EXISTS ix_tb_recetas_estado_fecha_id
    ON tb_recetas (estado, fecha_emision DESC, id_receta);
CREATE INDEX IF NOT EXISTS ix_tb_consulta_servicios_consulta_estado_id
    ON tb_consulta_servicios (id_consulta, estado, id_detalle);
CREATE INDEX IF NOT EXISTS ix_tb_catalogo_examenes_estado_categoria_nombre_id
    ON tb_catalogo_examenes (estado, categoria, nombre, id_examen);
CREATE INDEX IF NOT EXISTS ix_tb_ordenes_estado_fecha_id
    ON tb_ordenes_laboratorio (estado, fecha_orden DESC, id_orden);
CREATE INDEX IF NOT EXISTS ix_tb_ordenes_doctor_fecha_id
    ON tb_ordenes_laboratorio (id_doctor, fecha_orden DESC, id_orden)
    WHERE id_doctor IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_tb_ordenes_paciente_fecha_id
    ON tb_ordenes_laboratorio (id_paciente, fecha_orden DESC, id_orden);
CREATE INDEX IF NOT EXISTS ix_tb_resultados_orden_fecha_id
    ON tb_resultados_laboratorio (id_orden, fecha_resultado DESC, id_resultado);

COMMENT ON COLUMN tb_recetas.estado IS
    'Estado inmutable de la prescripción: emitida o anulada.';
COMMENT ON COLUMN tb_recetas.motivo_anulacion IS
    'Motivo obligatorio cuando una receta se anula sin eliminarla.';
COMMENT ON COLUMN tb_consulta_servicios.estado IS
    'Permite retirar lógicamente un procedimiento conservando el historial.';
COMMENT ON COLUMN tb_ordenes_laboratorio.fecha_finalizacion IS
    'Fecha asignada automáticamente cuando todos los resultados están completos.';
COMMENT ON FUNCTION fn_validar_finalizacion_orden_laboratorio() IS
    'Impide finalizar órdenes con exámenes pendientes y evita reabrir órdenes finalizadas.';

COMMIT;
