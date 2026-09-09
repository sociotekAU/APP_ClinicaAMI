\set ON_ERROR_STOP on

-- FASE 5.11 — Validación transaccional de facturación, caja e inventario.
-- La prueba siempre termina con ROLLBACK y no conserva datos de demostración.
BEGIN;

DO $$
DECLARE
    paciente_id INTEGER;
    usuario_id INTEGER;
    factura_id INTEGER;
    factura_snapshot JSONB;
    total_factura NUMERIC(12,2);
    rechazo_factura BOOLEAN := FALSE;
    rechazo_detalle BOOLEAN := FALSE;
BEGIN
    SELECT id_paciente INTO paciente_id FROM tb_pacientes WHERE estado = TRUE ORDER BY id_paciente LIMIT 1;
    SELECT id_usuario INTO usuario_id FROM tb_usuarios WHERE estado = TRUE ORDER BY id_usuario LIMIT 1;

    IF paciente_id IS NULL OR usuario_id IS NULL THEN
        RAISE EXCEPTION 'El seed no contiene paciente y usuario activos para probar facturación.';
    END IF;

    INSERT INTO tb_facturas (id_paciente, id_usuario, metodo_pago, observaciones)
    VALUES (paciente_id, usuario_id, 'efectivo', 'Factura reversible del Paso 5.11')
    RETURNING id_factura INTO factura_id;

    INSERT INTO tb_detalle_factura (id_factura, concepto, cantidad, precio_unitario)
    VALUES
        (factura_id, 'Consulta reversible', 2, 10.00),
        (factura_id, 'Material reversible', 1, 5.00);

    SELECT total INTO total_factura FROM tb_facturas WHERE id_factura = factura_id;
    IF total_factura <> 25.00 THEN
        RAISE EXCEPTION 'El total automático esperado era 25.00 y se obtuvo %.', total_factura;
    END IF;

    SELECT to_jsonb(source_row) || jsonb_build_object(
        'conceptos',
        COALESCE((
            SELECT jsonb_agg(to_jsonb(detail_row) ORDER BY detail_row.id_detalle)
              FROM tb_detalle_factura detail_row
             WHERE detail_row.id_factura = source_row.id_factura
        ), '[]'::jsonb)
    )
      INTO factura_snapshot
      FROM tb_facturas source_row
     WHERE source_row.id_factura = factura_id;

    IF jsonb_array_length(factura_snapshot -> 'conceptos') <> 2 THEN
        RAISE EXCEPTION 'La trazabilidad de la factura no incluyó sus conceptos.';
    END IF;

    UPDATE tb_facturas
       SET estado = 'anulada',
           fecha_anulacion = CURRENT_TIMESTAMP,
           motivo_anulacion = 'Anulación reversible del Paso 5.11'
     WHERE id_factura = factura_id;

    BEGIN
        UPDATE tb_facturas SET observaciones = 'Modificación silenciosa' WHERE id_factura = factura_id;
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_factura := POSITION('factura anulada es inmutable' IN LOWER(SQLERRM)) > 0;
    END;

    BEGIN
        UPDATE tb_detalle_factura SET concepto = 'Cambio no permitido' WHERE id_factura = factura_id;
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_detalle := POSITION('conceptos de una factura emitida son inmutables' IN LOWER(SQLERRM)) > 0;
    END;

    IF NOT rechazo_factura OR NOT rechazo_detalle THEN
        RAISE EXCEPTION 'No se protegió correctamente la factura o su detalle.';
    END IF;
END;
$$;

DO $$
DECLARE
    usuario_id INTEGER;
    proveedor_id INTEGER;
    insumo_id INTEGER;
    entrada_id INTEGER;
    salida_id INTEGER;
    stock NUMERIC(12,2);
    stock_bajo_actual BOOLEAN;
    rechazo_stock BOOLEAN := FALSE;
    rechazo_movimiento BOOLEAN := FALSE;
BEGIN
    SELECT id_usuario INTO usuario_id FROM tb_usuarios WHERE estado = TRUE ORDER BY id_usuario LIMIT 1;
    IF usuario_id IS NULL THEN
        RAISE EXCEPTION 'El seed no contiene un usuario activo para probar inventario.';
    END IF;

    INSERT INTO tb_proveedores (nombre_empresa, telefono)
    VALUES ('Proveedor reversible Paso 5.11', '0000-0000')
    RETURNING id_proveedor INTO proveedor_id;

    INSERT INTO tb_insumos_inventario (nombre, tipo, id_proveedor, stock_minimo, precio_costo, unidad_medida)
    VALUES ('Insumo reversible Paso 5.11', 'material_clinico', proveedor_id, 5, 1.25, 'unidad')
    RETURNING id_insumo, stock_bajo INTO insumo_id, stock_bajo_actual;

    IF stock_bajo_actual IS NOT TRUE THEN
        RAISE EXCEPTION 'Un insumo nuevo con existencia cero debía marcarse bajo mínimo.';
    END IF;

    INSERT INTO tb_movimientos_inventario (id_insumo, tipo_movimiento, cantidad, id_usuario, observaciones)
    VALUES (insumo_id, 'entrada', 10, usuario_id, 'Entrada reversible')
    RETURNING id_movimiento INTO entrada_id;

    IF NOT EXISTS (
        SELECT 1 FROM tb_movimientos_inventario
         WHERE id_movimiento = entrada_id AND stock_anterior = 0 AND stock_resultante = 10
    ) THEN
        RAISE EXCEPTION 'La entrada no conservó las existencias anterior y resultante.';
    END IF;

    INSERT INTO tb_movimientos_inventario (id_insumo, tipo_movimiento, cantidad, id_usuario, observaciones)
    VALUES (insumo_id, 'salida', 7, usuario_id, 'Salida reversible')
    RETURNING id_movimiento INTO salida_id;

    SELECT stock_actual, stock_bajo INTO stock, stock_bajo_actual
      FROM tb_insumos_inventario WHERE id_insumo = insumo_id;
    IF stock <> 3 OR stock_bajo_actual IS NOT TRUE THEN
        RAISE EXCEPTION 'La salida debía dejar existencia 3 y activar la alerta de mínimo.';
    END IF;

    BEGIN
        INSERT INTO tb_movimientos_inventario (id_insumo, tipo_movimiento, cantidad, id_usuario)
        VALUES (insumo_id, 'salida', 4, usuario_id);
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_stock := POSITION('stock insuficiente' IN LOWER(SQLERRM)) > 0;
    END;

    BEGIN
        UPDATE tb_movimientos_inventario SET observaciones = 'Cambio no permitido' WHERE id_movimiento = salida_id;
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_movimiento := POSITION('no se editan ni eliminan' IN LOWER(SQLERRM)) > 0;
    END;

    IF NOT rechazo_stock OR NOT rechazo_movimiento THEN
        RAISE EXCEPTION 'No se protegió el stock negativo o la inmutabilidad del kardex.';
    END IF;
END;
$$;

ROLLBACK;

SELECT 'OK: facturación, caja e inventario validados sin conservar datos de prueba' AS resultado;

