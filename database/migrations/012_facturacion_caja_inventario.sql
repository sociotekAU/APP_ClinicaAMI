-- FASE 5.11 — FACTURACIÓN, CAJA E INVENTARIO
-- Fuente de verdad: BD/. Copia operativa: APP_ClinicaAMI/database/migrations/.

BEGIN;

ALTER TABLE tb_facturas
    ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMP,
    ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

ALTER TABLE tb_insumos_inventario
    ADD COLUMN IF NOT EXISTS stock_bajo BOOLEAN
    GENERATED ALWAYS AS (stock_actual <= stock_minimo) STORED;

ALTER TABLE tb_movimientos_inventario
    ADD COLUMN IF NOT EXISTS stock_anterior NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS stock_resultante NUMERIC(12,2);

CREATE OR REPLACE FUNCTION fn_aplicar_movimiento_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    existencia NUMERIC(12,2);
    nueva_existencia NUMERIC(12,2);
BEGIN
    SELECT stock_actual
      INTO existencia
      FROM tb_insumos_inventario
     WHERE id_insumo = NEW.id_insumo
       AND estado = TRUE
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El insumo no existe o está inactivo.';
    END IF;

    IF NEW.tipo_movimiento = 'entrada' THEN
        nueva_existencia := existencia + NEW.cantidad;
    ELSE
        nueva_existencia := existencia - NEW.cantidad;
    END IF;

    IF nueva_existencia < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para registrar el movimiento.';
    END IF;

    NEW.stock_anterior := existencia;
    NEW.stock_resultante := nueva_existencia;

    UPDATE tb_insumos_inventario
       SET stock_actual = nueva_existencia
     WHERE id_insumo = NEW.id_insumo;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_proteger_factura_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las facturas no se eliminan; deben anularse con motivo.';
    END IF;

    IF OLD.estado = 'anulada' AND NEW IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Una factura anulada es inmutable.';
    END IF;

    IF OLD.estado = 'pagada'
       AND NEW.estado = 'pagada'
       AND NEW.id_paciente = OLD.id_paciente
       AND NEW.id_usuario = OLD.id_usuario
       AND NEW.fecha_emision = OLD.fecha_emision
       AND NEW.metodo_pago = OLD.metodo_pago
       AND NEW.observaciones IS NOT DISTINCT FROM OLD.observaciones
       AND NEW.fecha_anulacion IS NOT DISTINCT FROM OLD.fecha_anulacion
       AND NEW.motivo_anulacion IS NOT DISTINCT FROM OLD.motivo_anulacion
       AND pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF OLD.estado = 'pagada'
       AND NEW.estado = 'anulada'
       AND NEW.id_paciente = OLD.id_paciente
       AND NEW.id_usuario = OLD.id_usuario
       AND NEW.fecha_emision = OLD.fecha_emision
       AND NEW.total = OLD.total
       AND NEW.metodo_pago = OLD.metodo_pago
       AND NEW.observaciones IS NOT DISTINCT FROM OLD.observaciones
       AND NEW.fecha_anulacion IS NOT NULL
       AND NULLIF(BTRIM(NEW.motivo_anulacion), '') IS NOT NULL THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Una factura pagada solo puede anularse con fecha y motivo.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_factura_inmutable ON tb_facturas;
CREATE TRIGGER trg_proteger_factura_inmutable
BEFORE UPDATE OR DELETE ON tb_facturas
FOR EACH ROW EXECUTE FUNCTION fn_proteger_factura_inmutable();

CREATE OR REPLACE FUNCTION fn_proteger_detalle_factura_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    factura_id INTEGER;
    factura_estado VARCHAR(20);
BEGIN
    factura_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_factura ELSE NEW.id_factura END;
    SELECT estado INTO factura_estado FROM tb_facturas WHERE id_factura = factura_id;

    IF TG_OP = 'INSERT' AND factura_estado = 'pagada' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'No se pueden agregar conceptos a una factura anulada.';
    END IF;

    RAISE EXCEPTION 'Los conceptos de una factura emitida son inmutables.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_detalle_factura_inmutable ON tb_detalle_factura;
CREATE TRIGGER trg_proteger_detalle_factura_inmutable
BEFORE INSERT OR UPDATE OR DELETE ON tb_detalle_factura
FOR EACH ROW EXECUTE FUNCTION fn_proteger_detalle_factura_inmutable();

CREATE INDEX IF NOT EXISTS ix_tb_facturas_estado_fecha_id
    ON tb_facturas (estado, fecha_emision DESC, id_factura DESC);
CREATE INDEX IF NOT EXISTS ix_tb_facturas_paciente_fecha_id
    ON tb_facturas (id_paciente, fecha_emision DESC, id_factura DESC);
CREATE INDEX IF NOT EXISTS ix_tb_proveedores_estado_nombre_id
    ON tb_proveedores (estado, nombre_empresa, id_proveedor);
CREATE INDEX IF NOT EXISTS ix_tb_insumos_estado_stock_bajo_nombre_id
    ON tb_insumos_inventario (estado, stock_bajo, nombre, id_insumo);
CREATE INDEX IF NOT EXISTS ix_tb_movimientos_tipo_fecha_id
    ON tb_movimientos_inventario (tipo_movimiento, fecha DESC, id_movimiento DESC);
CREATE INDEX IF NOT EXISTS ix_tb_movimientos_insumo_fecha_id
    ON tb_movimientos_inventario (id_insumo, fecha DESC, id_movimiento DESC);

COMMENT ON COLUMN tb_facturas.fecha_anulacion IS
    'Fecha de la anulación lógica del comprobante.';
COMMENT ON COLUMN tb_facturas.motivo_anulacion IS
    'Motivo obligatorio de la anulación; el comprobante nunca se elimina.';
COMMENT ON COLUMN tb_insumos_inventario.stock_bajo IS
    'Indicador calculado cuando la existencia alcanza o cae bajo el mínimo.';
COMMENT ON COLUMN tb_movimientos_inventario.stock_anterior IS
    'Existencia bloqueada inmediatamente antes de aplicar el movimiento.';
COMMENT ON COLUMN tb_movimientos_inventario.stock_resultante IS
    'Existencia resultante e inmutable después de aplicar el movimiento.';

COMMIT;
