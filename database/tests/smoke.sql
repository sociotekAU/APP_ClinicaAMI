\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    total_tablas INTEGER;
    tabla RECORD;
    contiene_datos BOOLEAN;
BEGIN
    SELECT COUNT(*)
      INTO total_tablas
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE';

    IF total_tablas < 31 THEN
        RAISE EXCEPTION 'Se esperaban al menos 31 tablas y se encontraron %.', total_tablas;
    END IF;

    FOR tabla IN
        SELECT tablename
          FROM pg_tables
         WHERE schemaname = 'public'
    LOOP
        EXECUTE FORMAT('SELECT EXISTS (SELECT 1 FROM %I)', tabla.tablename)
           INTO contiene_datos;

        IF NOT contiene_datos THEN
            RAISE EXCEPTION 'La tabla % no contiene datos del seed.', tabla.tablename;
        END IF;
    END LOOP;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM tb_especialidades
         WHERE nombre = 'Psiquiatría'
           AND admite_expediente_psicologico = TRUE
    ) OR NOT EXISTS (
        SELECT 1
          FROM tb_especialidades
         WHERE nombre = 'Psicología y Terapia de Lenguaje'
           AND admite_expediente_psicologico = TRUE
    ) THEN
        RAISE EXCEPTION 'Las especialidades psicológicas iniciales no están habilitadas.';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r ON r.id_rol = p.id_rol
         WHERE p.modulo = 'auditoria'
           AND r.nombre_rol = 'Administrador'
           AND p.puede_leer = TRUE
           AND p.puede_escribir = FALSE
    ) OR EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r ON r.id_rol = p.id_rol
         WHERE p.modulo = 'auditoria'
           AND r.nombre_rol <> 'Administrador'
           AND p.puede_leer = TRUE
    ) THEN
        RAISE EXCEPTION 'El visor de auditoría no está restringido al administrador.';
    END IF;
END;
$$;

DO $$
DECLARE
    rechazo_correcto BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE tb_auditoria
           SET motivo = 'alteración no permitida'
         WHERE id_auditoria = (SELECT MIN(id_auditoria) FROM tb_auditoria);
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_correcto := POSITION('bitácora de auditoría es inmutable' IN SQLERRM) > 0;
    END;
    IF NOT rechazo_correcto THEN
        RAISE EXCEPTION 'Fue posible modificar la bitácora de auditoría.';
    END IF;
END;
$$;

DO $$
DECLARE
    receta_id INTEGER;
    rechazo_correcto BOOLEAN := FALSE;
BEGIN
    SELECT id_receta INTO receta_id FROM tb_recetas WHERE estado = 'emitida' LIMIT 1;
    BEGIN
        UPDATE tb_recetas SET diagnostico = diagnostico || ' alterado' WHERE id_receta = receta_id;
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_correcto := POSITION('solo puede pasar a anulada' IN SQLERRM) > 0;
    END;
    IF NOT rechazo_correcto THEN
        RAISE EXCEPTION 'Fue posible editar silenciosamente una receta emitida.';
    END IF;

    UPDATE tb_recetas
       SET estado = 'anulada',
           fecha_anulacion = CURRENT_TIMESTAMP,
           motivo_anulacion = 'Prueba reversible de trazabilidad'
     WHERE id_receta = receta_id;
END;
$$;

DO $$
DECLARE
    rechazo_correcto BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE tb_resultados_laboratorio r
           SET valor_obtenido = 'alterado'
          FROM tb_ordenes_laboratorio o
         WHERE o.id_orden = r.id_orden
           AND o.estado = 'finalizado';
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_correcto := POSITION('orden finalizada son inmutables' IN SQLERRM) > 0;
    END;
    IF NOT rechazo_correcto THEN
        RAISE EXCEPTION 'Fue posible modificar un resultado de laboratorio finalizado.';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM tb_usuarios
         WHERE username = 'admin_ami'
           AND password_hash LIKE '$2%'
           AND estado = TRUE
    ) THEN
        RAISE EXCEPTION 'La cuenta administrativa no existe, está inactiva o no conserva un hash bcrypt.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM tb_usuarios u
          JOIN tb_medicos m ON m.id = u.id_doctor
         WHERE u.username = 'moises'
           AND m.nombre = 'Dr. Moisés Valdez'
           AND u.password_hash LIKE '$2%'
           AND u.estado = TRUE
    ) THEN
        RAISE EXCEPTION 'La cuenta del Dr. Moisés no es válida, no está activa o no está vinculada.';
    END IF;
END;
$$;

UPDATE tb_detalle_factura
   SET cantidad = 2,
       precio_unitario = 125.50
 WHERE concepto = 'Consulta de Medicina Biológica Integrativa';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM tb_facturas
         WHERE observaciones = 'Factura de demostración inicial.'
           AND total = 251.00
    ) THEN
        RAISE EXCEPTION 'El total de factura no fue recalculado correctamente.';
    END IF;
END;
$$;

UPDATE tb_especialidades
   SET estado = FALSE
 WHERE nombre = 'Medicina Biológica Integrativa';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM tb_medicos
         WHERE nombre = 'Dr. Moisés Valdez'
           AND estado = TRUE
    ) THEN
        RAISE EXCEPTION 'La desactivación de especialidad no desactivó al médico.';
    END IF;
END;
$$;

DO $$
DECLARE
    insumo_id INTEGER;
    usuario_id INTEGER;
    rechazo_correcto BOOLEAN := FALSE;
BEGIN
    SELECT id_insumo
      INTO insumo_id
      FROM tb_insumos_inventario
     LIMIT 1;

    SELECT id_usuario
      INTO usuario_id
      FROM tb_usuarios
     WHERE username = 'admin_ami';

    BEGIN
        INSERT INTO tb_movimientos_inventario (
            id_insumo, tipo_movimiento, cantidad, id_usuario, observaciones
        )
        VALUES (
            insumo_id, 'salida', 999999, usuario_id, 'Prueba reversible'
        );
    EXCEPTION
        WHEN OTHERS THEN
            IF POSITION('Stock insuficiente' IN SQLERRM) > 0 THEN
                rechazo_correcto := TRUE;
            ELSE
                RAISE;
            END IF;
    END;

    IF NOT rechazo_correcto THEN
        RAISE EXCEPTION 'El inventario permitió una salida con stock insuficiente.';
    END IF;
END;
$$;

DO $$
DECLARE
    rechazo_correcto BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE tb_movimientos_inventario
           SET cantidad = cantidad + 1
         WHERE observaciones = 'Carga inicial de inventario de demostración.';
    EXCEPTION
        WHEN OTHERS THEN
            IF POSITION('no se editan ni eliminan' IN SQLERRM) > 0 THEN
                rechazo_correcto := TRUE;
            ELSE
                RAISE;
            END IF;
    END;

    IF NOT rechazo_correcto THEN
        RAISE EXCEPTION 'Fue posible editar un movimiento de inventario.';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM tb_signos_vitales_medidas
         WHERE imc = 24.22
    ) THEN
        RAISE EXCEPTION 'El cálculo automático del IMC no produjo el valor esperado.';
    END IF;
END;
$$;

ROLLBACK;

SELECT 'OK: esquema, seed y reglas críticas validados' AS resultado;
