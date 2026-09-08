-- CLÍNICA A.M.I. — ÍNDICES PARA LISTADOS CRUD
-- Fuente oficial: BD/. Esta migración es aditiva e idempotente.

BEGIN;

CREATE INDEX IF NOT EXISTS ix_tb_permisos_rol_modulo_rol
    ON tb_permisos_rol (modulo, id_rol);

COMMENT ON INDEX ix_tb_permisos_rol_modulo_rol IS
    'Acelera filtros por módulo y la paginación estable de la matriz de permisos.';

COMMIT;
