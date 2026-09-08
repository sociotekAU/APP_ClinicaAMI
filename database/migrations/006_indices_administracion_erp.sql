BEGIN;

-- Paginación estable de los catálogos administrativos por estado.
CREATE INDEX IF NOT EXISTS ix_tb_especialidades_estado_id
    ON tb_especialidades (estado, id);

CREATE INDEX IF NOT EXISTS ix_tb_servicios_estado_id
    ON tb_servicios (estado, id);

-- Filtros habituales del directorio profesional.
CREATE INDEX IF NOT EXISTS ix_tb_medicos_especialidad_estado_id
    ON tb_medicos (especialidad_id, estado, id);

-- Filtros de seguridad por rol y estado, con desempate estable.
CREATE INDEX IF NOT EXISTS ix_tb_usuarios_rol_estado_id
    ON tb_usuarios (id_rol, estado, id_usuario);

COMMENT ON INDEX ix_tb_especialidades_estado_id IS
    'Soporta filtros de estado y paginación estable del CRUD de especialidades.';
COMMENT ON INDEX ix_tb_servicios_estado_id IS
    'Soporta filtros de estado y paginación estable del CRUD de servicios.';
COMMENT ON INDEX ix_tb_medicos_especialidad_estado_id IS
    'Soporta filtros por especialidad y estado del directorio profesional.';
COMMENT ON INDEX ix_tb_usuarios_rol_estado_id IS
    'Soporta filtros por rol y estado del CRUD de usuarios.';

COMMIT;
