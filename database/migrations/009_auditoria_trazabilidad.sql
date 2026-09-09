-- FASE 5.8 — AUDITORÍA Y TRAZABILIDAD
-- Fuente de verdad: BD/. Copia operativa: APP_ClinicaAMI/database/migrations/.

BEGIN;

CREATE TABLE IF NOT EXISTS tb_auditoria (
    id_auditoria BIGSERIAL PRIMARY KEY,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER,
    usuario VARCHAR(80) NOT NULL,
    rol VARCHAR(80),
    modulo VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    id_registro VARCHAR(100),
    accion VARCHAR(30) NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    campos_modificados TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    motivo TEXT,
    request_id VARCHAR(100),
    direccion_ip VARCHAR(64),
    agente_usuario VARCHAR(500),
    ruta VARCHAR(500),
    metodo VARCHAR(10),
    origen VARCHAR(20) NOT NULL DEFAULT 'api',
    CONSTRAINT fk_tb_auditoria_usuario
        FOREIGN KEY (id_usuario) REFERENCES tb_usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_tb_auditoria_accion
        CHECK (accion IN (
            'creacion', 'modificacion', 'cambio_estado', 'desactivacion',
            'reactivacion', 'anulacion', 'cancelacion', 'finalizacion',
            'eliminacion', 'cambio_password', 'sistema'
        )),
    CONSTRAINT ck_tb_auditoria_origen
        CHECK (origen IN ('api', 'sistema', 'base_datos'))
);

CREATE INDEX IF NOT EXISTS ix_tb_auditoria_fecha_id
    ON tb_auditoria (fecha_evento DESC, id_auditoria DESC);

CREATE INDEX IF NOT EXISTS ix_tb_auditoria_usuario_fecha
    ON tb_auditoria (id_usuario, fecha_evento DESC, id_auditoria DESC)
    WHERE id_usuario IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tb_auditoria_modulo_accion_fecha
    ON tb_auditoria (modulo, accion, fecha_evento DESC, id_auditoria DESC);

CREATE INDEX IF NOT EXISTS ix_tb_auditoria_entidad_registro_fecha
    ON tb_auditoria (entidad, id_registro, fecha_evento DESC, id_auditoria DESC);

CREATE INDEX IF NOT EXISTS ix_tb_auditoria_campos
    ON tb_auditoria USING GIN (campos_modificados);

COMMENT ON TABLE tb_auditoria IS
    'Bitácora append-only de operaciones exitosas realizadas en el ERP.';
COMMENT ON COLUMN tb_auditoria.usuario IS
    'Snapshot del nombre de usuario para conservar la atribución histórica.';
COMMENT ON COLUMN tb_auditoria.datos_anteriores IS
    'Estado previo saneado; nunca debe contener contraseñas, tokens ni secretos.';
COMMENT ON COLUMN tb_auditoria.datos_nuevos IS
    'Estado posterior saneado; nunca debe contener contraseñas, tokens ni secretos.';

CREATE OR REPLACE FUNCTION fn_bloquear_cambio_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'La bitácora de auditoría es inmutable: no se edita ni se elimina.';
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_cambio_auditoria ON tb_auditoria;
CREATE TRIGGER trg_bloquear_cambio_auditoria
BEFORE UPDATE OR DELETE ON tb_auditoria
FOR EACH ROW EXECUTE FUNCTION fn_bloquear_cambio_auditoria();

CREATE OR REPLACE FUNCTION fn_proteger_receta_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las recetas emitidas no se eliminan; deben anularse con motivo.';
    END IF;

    IF OLD.estado = 'anulada' THEN
        RAISE EXCEPTION 'Una receta anulada es inmutable.';
    END IF;

    IF NEW.id_doctor IS DISTINCT FROM OLD.id_doctor
       OR NEW.id_paciente IS DISTINCT FROM OLD.id_paciente
       OR NEW.fecha_emision IS DISTINCT FROM OLD.fecha_emision
       OR NEW.diagnostico IS DISTINCT FROM OLD.diagnostico
       OR NEW.estado <> 'anulada'
       OR NULLIF(BTRIM(NEW.motivo_anulacion), '') IS NULL
       OR NEW.fecha_anulacion IS NULL THEN
        RAISE EXCEPTION 'Una receta emitida solo puede pasar a anulada con fecha y motivo.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_receta_inmutable ON tb_recetas;
CREATE TRIGGER trg_proteger_receta_inmutable
BEFORE UPDATE OR DELETE ON tb_recetas
FOR EACH ROW EXECUTE FUNCTION fn_proteger_receta_inmutable();

CREATE OR REPLACE FUNCTION fn_proteger_detalle_receta_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Las líneas de una receta emitida no se editan ni se eliminan.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_detalle_receta_inmutable ON tb_detalle_receta;
CREATE TRIGGER trg_proteger_detalle_receta_inmutable
BEFORE UPDATE OR DELETE ON tb_detalle_receta
FOR EACH ROW EXECUTE FUNCTION fn_proteger_detalle_receta_inmutable();

CREATE OR REPLACE FUNCTION fn_proteger_resultado_laboratorio_finalizado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    orden_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        orden_id := OLD.id_orden;
    ELSE
        orden_id := NEW.id_orden;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM tb_ordenes_laboratorio
         WHERE id_orden = orden_id
           AND estado = 'finalizado'
    ) THEN
        RAISE EXCEPTION 'Los resultados de una orden finalizada son inmutables.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_resultado_laboratorio_finalizado
    ON tb_resultados_laboratorio;
CREATE TRIGGER trg_proteger_resultado_laboratorio_finalizado
BEFORE INSERT OR UPDATE OR DELETE ON tb_resultados_laboratorio
FOR EACH ROW EXECUTE FUNCTION fn_proteger_resultado_laboratorio_finalizado();

CREATE OR REPLACE FUNCTION fn_proteger_orden_laboratorio_finalizada()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.estado = 'finalizado' AND NEW IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Una orden finalizada es inmutable.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_orden_laboratorio_finalizada
    ON tb_ordenes_laboratorio;
CREATE TRIGGER trg_proteger_orden_laboratorio_finalizada
BEFORE UPDATE ON tb_ordenes_laboratorio
FOR EACH ROW EXECUTE FUNCTION fn_proteger_orden_laboratorio_finalizada();

CREATE OR REPLACE FUNCTION fn_proteger_eliminacion_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'El historial clínico, financiero y de inventario no se elimina físicamente.';
END;
$$;

DROP TRIGGER IF EXISTS trg_no_eliminar_consultas ON tb_consultas;
CREATE TRIGGER trg_no_eliminar_consultas
BEFORE DELETE ON tb_consultas
FOR EACH ROW EXECUTE FUNCTION fn_proteger_eliminacion_historial();

DROP TRIGGER IF EXISTS trg_no_eliminar_signos_vitales ON tb_signos_vitales_medidas;
CREATE TRIGGER trg_no_eliminar_signos_vitales
BEFORE DELETE ON tb_signos_vitales_medidas
FOR EACH ROW EXECUTE FUNCTION fn_proteger_eliminacion_historial();

DROP TRIGGER IF EXISTS trg_no_eliminar_facturas ON tb_facturas;
CREATE TRIGGER trg_no_eliminar_facturas
BEFORE DELETE ON tb_facturas
FOR EACH ROW EXECUTE FUNCTION fn_proteger_eliminacion_historial();

DROP TRIGGER IF EXISTS trg_no_eliminar_detalle_factura ON tb_detalle_factura;
CREATE TRIGGER trg_no_eliminar_detalle_factura
BEFORE DELETE ON tb_detalle_factura
FOR EACH ROW EXECUTE FUNCTION fn_proteger_eliminacion_historial();

DROP TRIGGER IF EXISTS trg_no_eliminar_ordenes_laboratorio ON tb_ordenes_laboratorio;
CREATE TRIGGER trg_no_eliminar_ordenes_laboratorio
BEFORE DELETE ON tb_ordenes_laboratorio
FOR EACH ROW EXECUTE FUNCTION fn_proteger_eliminacion_historial();

COMMIT;
