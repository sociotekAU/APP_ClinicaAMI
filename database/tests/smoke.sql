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

    IF total_tablas < 30 THEN
        RAISE EXCEPTION 'Se esperaban al menos 30 tablas y se encontraron %.', total_tablas;
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
          FROM tb_usuarios
         WHERE username = 'admin_ami'
           AND crypt('AmiAzul#27', password_hash) = password_hash
           AND debe_cambiar_password = TRUE
    ) THEN
        RAISE EXCEPTION 'La cuenta administrativa o su contraseña no son válidas.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM tb_usuarios u
          JOIN tb_medicos m ON m.id = u.id_doctor
         WHERE u.username = 'moises'
           AND m.nombre = 'Dr. Moisés Valdez'
           AND crypt('MoisesSalud#27', u.password_hash) = u.password_hash
           AND u.debe_cambiar_password = TRUE
    ) THEN
        RAISE EXCEPTION 'La cuenta del Dr. Moisés no es válida o no está vinculada.';
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
