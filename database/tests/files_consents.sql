\set ON_ERROR_STOP on

-- FASE 5.12 — Validación transaccional de archivos y consentimientos.
-- Siempre termina con ROLLBACK y no conserva datos de prueba.
BEGIN;

DO $$
DECLARE
    paciente_id INTEGER;
    consulta_id INTEGER;
    usuario_id INTEGER;
    archivo_id INTEGER;
    rechazo_ruta BOOLEAN := FALSE;
    rechazo_borrado BOOLEAN := FALSE;
BEGIN
    SELECT x.id_consulta, c.id_paciente INTO consulta_id, paciente_id
      FROM tb_consultas x
      JOIN tb_citas c ON c.id_cita = x.id_cita
     ORDER BY x.id_consulta LIMIT 1;
    SELECT id_usuario INTO usuario_id FROM tb_usuarios WHERE estado = TRUE ORDER BY id_usuario LIMIT 1;

    INSERT INTO tb_archivos_estudios (
        id_paciente, id_consulta, tipo_estudio, ruta_archivo, id_usuario,
        descripcion, nombre_original, tipo_mime, tamano_bytes, hash_sha256
    ) VALUES (
        paciente_id, consulta_id, 'Prueba reversible', 'studies/prueba-reversible.pdf', usuario_id,
        'Archivo temporal del Paso 5.12', 'prueba.pdf', 'application/pdf', 100,
        repeat('a', 64)
    ) RETURNING id_archivo INTO archivo_id;

    UPDATE tb_archivos_estudios
       SET estado = FALSE, fecha_estado = CURRENT_TIMESTAMP,
           motivo_estado = 'Desactivación reversible', id_usuario_estado = usuario_id
     WHERE id_archivo = archivo_id;
    UPDATE tb_archivos_estudios
       SET estado = TRUE, fecha_estado = CURRENT_TIMESTAMP,
           motivo_estado = 'Reactivación reversible', id_usuario_estado = usuario_id
     WHERE id_archivo = archivo_id;

    BEGIN
        UPDATE tb_archivos_estudios SET ruta_archivo = 'studies/cambio.pdf' WHERE id_archivo = archivo_id;
    EXCEPTION WHEN OTHERS THEN
        rechazo_ruta := POSITION('archivo físico y sus relaciones son inmutables' IN LOWER(SQLERRM)) > 0;
    END;
    BEGIN
        DELETE FROM tb_archivos_estudios WHERE id_archivo = archivo_id;
    EXCEPTION WHEN OTHERS THEN
        rechazo_borrado := POSITION('no se eliminan' IN LOWER(SQLERRM)) > 0;
    END;
    IF NOT rechazo_ruta OR NOT rechazo_borrado THEN
        RAISE EXCEPTION 'No se protegió la identidad o conservación del archivo de estudio.';
    END IF;
END;
$$;

DO $$
DECLARE
    paciente_id INTEGER;
    servicio_id INTEGER;
    usuario_id INTEGER;
    consentimiento_id INTEGER;
    rechazo_edicion BOOLEAN := FALSE;
    rechazo_reapertura BOOLEAN := FALSE;
BEGIN
    SELECT id_paciente INTO paciente_id FROM tb_pacientes WHERE estado = TRUE ORDER BY id_paciente LIMIT 1;
    SELECT id INTO servicio_id FROM tb_servicios WHERE estado = TRUE ORDER BY id LIMIT 1;
    SELECT id_usuario INTO usuario_id FROM tb_usuarios WHERE estado = TRUE ORDER BY id_usuario LIMIT 1;

    INSERT INTO tb_consentimientos_informados (
        id_paciente, id_servicio, estado_firma, ruta_documento, id_usuario,
        observaciones, nombre_original, tipo_mime, tamano_bytes, hash_sha256
    ) VALUES (
        paciente_id, servicio_id, 'pendiente', 'consents/prueba-reversible.pdf', usuario_id,
        'Consentimiento temporal del Paso 5.12', 'consentimiento.pdf', 'application/pdf', 120,
        repeat('b', 64)
    ) RETURNING id_consentimiento INTO consentimiento_id;

    UPDATE tb_consentimientos_informados
       SET estado_firma = 'firmado', fecha_firma = CURRENT_TIMESTAMP,
           fecha_estado = CURRENT_TIMESTAMP, motivo_estado = 'Firma confirmada durante prueba',
           id_usuario_estado = usuario_id
     WHERE id_consentimiento = consentimiento_id;

    BEGIN
        UPDATE tb_consentimientos_informados SET observaciones = 'Cambio silencioso' WHERE id_consentimiento = consentimiento_id;
    EXCEPTION WHEN OTHERS THEN
        rechazo_edicion := POSITION('consentimiento finalizado es inmutable' IN LOWER(SQLERRM)) > 0;
    END;

    UPDATE tb_consentimientos_informados
       SET estado_firma = 'revocado', fecha_estado = CURRENT_TIMESTAMP,
           motivo_estado = 'Revocación reversible durante prueba', id_usuario_estado = usuario_id
     WHERE id_consentimiento = consentimiento_id;

    BEGIN
        UPDATE tb_consentimientos_informados
           SET estado_firma = 'firmado', motivo_estado = 'Reapertura no permitida'
         WHERE id_consentimiento = consentimiento_id;
    EXCEPTION WHEN OTHERS THEN
        rechazo_reapertura := POSITION('consentimiento finalizado es inmutable' IN LOWER(SQLERRM)) > 0;
    END;

    IF NOT rechazo_edicion OR NOT rechazo_reapertura THEN
        RAISE EXCEPTION 'No se protegió la inmutabilidad legal del consentimiento.';
    END IF;
END;
$$;

ROLLBACK;

SELECT 'OK: archivos y consentimientos validados sin conservar datos de prueba' AS resultado;

