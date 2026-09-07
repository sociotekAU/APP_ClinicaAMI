\set ON_ERROR_STOP on

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r USING (id_rol)
         WHERE r.nombre_rol = 'Médico'
           AND p.modulo = 'expediente_general'
           AND p.puede_leer
           AND p.puede_escribir
    ) OR EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r USING (id_rol)
         WHERE r.nombre_rol = 'Médico'
           AND p.modulo = 'expediente_psicologia'
           AND (p.puede_leer OR p.puede_escribir OR p.puede_borrar)
    ) THEN
        RAISE EXCEPTION 'El rol Médico no conserva el aislamiento esperado.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r USING (id_rol)
         WHERE r.nombre_rol = 'Psicólogo'
           AND p.modulo = 'expediente_psicologia'
           AND p.puede_leer
           AND p.puede_escribir
    ) OR EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r USING (id_rol)
         WHERE r.nombre_rol = 'Psicólogo'
           AND p.modulo = 'expediente_general'
           AND (p.puede_leer OR p.puede_escribir OR p.puede_borrar)
    ) THEN
        RAISE EXCEPTION 'El rol Psicólogo no conserva el aislamiento esperado.';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r USING (id_rol)
         WHERE r.nombre_rol = 'Recepcionista'
           AND p.modulo IN ('expediente_general', 'expediente_psicologia')
           AND (p.puede_leer OR p.puede_escribir OR p.puede_borrar)
    ) THEN
        RAISE EXCEPTION 'Recepción obtuvo acceso a un expediente reservado.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r USING (id_rol)
         WHERE r.nombre_rol = 'Administrador'
           AND p.modulo = 'expediente_general'
           AND p.puede_leer
    ) OR NOT EXISTS (
        SELECT 1
          FROM tb_permisos_rol p
          JOIN tb_roles r USING (id_rol)
         WHERE r.nombre_rol = 'Administrador'
           AND p.modulo = 'expediente_psicologia'
           AND p.puede_leer
    ) THEN
        RAISE EXCEPTION 'El administrador no conserva los accesos de supervisión definidos.';
    END IF;

    IF EXISTS (SELECT 1 FROM tb_permisos_rol WHERE puede_borrar) THEN
        RAISE EXCEPTION 'Se detectó un permiso de eliminación física no aprobado.';
    END IF;
END;
$$;

SELECT 'OK: aislamiento de expedientes y política sin borrado validados' AS resultado;
