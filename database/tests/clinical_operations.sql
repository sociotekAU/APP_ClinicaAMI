\set ON_ERROR_STOP on

-- FASE 5.10 — Validación transaccional de recetas, procedimientos y laboratorio.
-- La prueba siempre termina con ROLLBACK y no conserva datos de demostración.
BEGIN;

DO $$
DECLARE
    paciente_id INTEGER;
    profesional_id INTEGER;
    medicamento_id INTEGER;
    receta_id INTEGER;
    detalle_id INTEGER;
    receta_snapshot JSONB;
    rechazo_correcto BOOLEAN := FALSE;
BEGIN
    SELECT id_paciente INTO paciente_id
      FROM tb_pacientes
     WHERE estado = TRUE
     ORDER BY id_paciente
     LIMIT 1;
    SELECT id INTO profesional_id
      FROM tb_medicos
     WHERE LOWER(nombre) = LOWER('Dr. Moisés Valdez')
     LIMIT 1;
    SELECT id_medicamento INTO medicamento_id
      FROM tb_medicamentos
     WHERE LOWER(nombre_comercial) = LOWER('Acetaminofén')
     LIMIT 1;

    IF paciente_id IS NULL OR profesional_id IS NULL OR medicamento_id IS NULL THEN
        RAISE EXCEPTION 'El seed no contiene las relaciones requeridas para probar recetas.';
    END IF;

    INSERT INTO tb_recetas (id_doctor, id_paciente, diagnostico)
    VALUES (profesional_id, paciente_id, 'Prueba reversible del Paso 5.10')
    RETURNING id_receta INTO receta_id;

    INSERT INTO tb_detalle_receta (id_receta, id_medicamento, dosis, duracion_dias)
    VALUES (receta_id, medicamento_id, 'Una tableta cada 8 horas', 3)
    RETURNING id_detalle INTO detalle_id;

    IF detalle_id IS NULL THEN
        RAISE EXCEPTION 'No se creó el detalle de la receta dentro de la transacción.';
    END IF;

    SELECT to_jsonb(source_row) || jsonb_build_object(
        'medicamentos',
        COALESCE((
            SELECT jsonb_agg(to_jsonb(detail_row) ORDER BY detail_row.id_detalle)
              FROM tb_detalle_receta detail_row
             WHERE detail_row.id_receta = source_row.id_receta
        ), '[]'::jsonb)
    )
      INTO receta_snapshot
      FROM tb_recetas source_row
     WHERE source_row.id_receta = receta_id;

    IF jsonb_array_length(receta_snapshot -> 'medicamentos') <> 1 THEN
        RAISE EXCEPTION 'La trazabilidad de la receta no incluyó sus medicamentos.';
    END IF;

    UPDATE tb_recetas
       SET estado = 'anulada',
           fecha_anulacion = CURRENT_TIMESTAMP,
           motivo_anulacion = 'Anulación reversible del Paso 5.10'
     WHERE id_receta = receta_id;

    BEGIN
        UPDATE tb_recetas
           SET diagnostico = 'Modificación silenciosa no permitida'
         WHERE id_receta = receta_id;
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_correcto := POSITION('receta anulada es inmutable' IN LOWER(SQLERRM)) > 0;
    END;

    IF NOT rechazo_correcto THEN
        RAISE EXCEPTION 'Fue posible modificar una receta después de anularla.';
    END IF;
END;
$$;

DO $$
DECLARE
    consulta_id INTEGER;
    servicio_id INTEGER;
    procedimiento_id INTEGER;
BEGIN
    SELECT x.id_consulta INTO consulta_id
      FROM tb_consultas x
     ORDER BY x.id_consulta
     LIMIT 1;

    IF consulta_id IS NULL THEN
        RAISE EXCEPTION 'El seed no contiene un expediente para probar procedimientos.';
    END IF;

    INSERT INTO tb_servicios (nombre, descripcion, precio, estado)
    VALUES ('Servicio reversible Paso 5.10', 'Solo existe durante la prueba.', 1.00, TRUE)
    RETURNING id INTO servicio_id;

    INSERT INTO tb_consulta_servicios (id_consulta, id_servicio, observaciones_procedimiento)
    VALUES (consulta_id, servicio_id, 'Procedimiento reversible activo.')
    RETURNING id_detalle INTO procedimiento_id;

    UPDATE tb_consulta_servicios
       SET estado = FALSE
     WHERE id_detalle = procedimiento_id;
    UPDATE tb_consulta_servicios
       SET estado = TRUE,
           observaciones_procedimiento = 'Procedimiento reactivado y actualizado.'
     WHERE id_detalle = procedimiento_id;

    IF NOT EXISTS (
        SELECT 1
          FROM tb_consulta_servicios
         WHERE id_detalle = procedimiento_id
           AND estado = TRUE
           AND observaciones_procedimiento = 'Procedimiento reactivado y actualizado.'
    ) THEN
        RAISE EXCEPTION 'No se conservaron los cambios de estado del procedimiento.';
    END IF;
END;
$$;

DO $$
DECLARE
    paciente_id INTEGER;
    profesional_id INTEGER;
    examen_id INTEGER;
    orden_id INTEGER;
    resultado_id INTEGER;
    orden_snapshot JSONB;
    rechazo_pendiente BOOLEAN := FALSE;
    rechazo_finalizado BOOLEAN := FALSE;
BEGIN
    SELECT id_paciente INTO paciente_id
      FROM tb_pacientes
     WHERE estado = TRUE
     ORDER BY id_paciente
     LIMIT 1;
    SELECT id INTO profesional_id
      FROM tb_medicos
     WHERE LOWER(nombre) = LOWER('Dr. Moisés Valdez')
     LIMIT 1;

    IF paciente_id IS NULL OR profesional_id IS NULL THEN
        RAISE EXCEPTION 'El seed no contiene las relaciones requeridas para probar laboratorio.';
    END IF;

    INSERT INTO tb_catalogo_examenes (nombre, categoria, valores_referencia, unidad_medida, estado)
    VALUES ('Examen reversible Paso 5.10', 'Control', '10-20', 'u', TRUE)
    RETURNING id_examen INTO examen_id;

    INSERT INTO tb_ordenes_laboratorio (id_paciente, id_doctor, estado, observaciones)
    VALUES (paciente_id, profesional_id, 'pendiente', 'Orden reversible del Paso 5.10')
    RETURNING id_orden INTO orden_id;

    INSERT INTO tb_resultados_laboratorio (id_orden, id_examen)
    VALUES (orden_id, examen_id)
    RETURNING id_resultado INTO resultado_id;

    SELECT to_jsonb(source_row) || jsonb_build_object(
        'resultados',
        COALESCE((
            SELECT jsonb_agg(to_jsonb(result_row) ORDER BY result_row.id_resultado)
              FROM tb_resultados_laboratorio result_row
             WHERE result_row.id_orden = source_row.id_orden
        ), '[]'::jsonb)
    )
      INTO orden_snapshot
      FROM tb_ordenes_laboratorio source_row
     WHERE source_row.id_orden = orden_id;

    IF jsonb_array_length(orden_snapshot -> 'resultados') <> 1 THEN
        RAISE EXCEPTION 'La trazabilidad de la orden no incluyó sus resultados.';
    END IF;

    BEGIN
        UPDATE tb_ordenes_laboratorio
           SET estado = 'finalizado'
         WHERE id_orden = orden_id;
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_pendiente := POSITION('todos los exámenes deben tener resultado' IN LOWER(SQLERRM)) > 0;
    END;

    IF NOT rechazo_pendiente THEN
        RAISE EXCEPTION 'Fue posible finalizar una orden con resultados pendientes.';
    END IF;

    UPDATE tb_resultados_laboratorio
       SET valor_obtenido = '15',
           observaciones = 'Resultado reversible.',
           fecha_resultado = CURRENT_TIMESTAMP
     WHERE id_resultado = resultado_id;
    UPDATE tb_ordenes_laboratorio
       SET estado = 'procesando'
     WHERE id_orden = orden_id;
    UPDATE tb_ordenes_laboratorio
       SET estado = 'finalizado'
     WHERE id_orden = orden_id;

    IF NOT EXISTS (
        SELECT 1
          FROM tb_ordenes_laboratorio
         WHERE id_orden = orden_id
           AND estado = 'finalizado'
           AND fecha_finalizacion IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'La orden completa no registró su finalización.';
    END IF;

    BEGIN
        UPDATE tb_resultados_laboratorio
           SET valor_obtenido = '16'
         WHERE id_resultado = resultado_id;
    EXCEPTION
        WHEN OTHERS THEN
            rechazo_finalizado := POSITION('orden finalizada son inmutables' IN LOWER(SQLERRM)) > 0;
    END;

    IF NOT rechazo_finalizado THEN
        RAISE EXCEPTION 'Fue posible modificar un resultado después de finalizar la orden.';
    END IF;
END;
$$;

ROLLBACK;

SELECT 'OK: recetas, procedimientos y laboratorio validados sin conservar datos de prueba' AS resultado;
