-- PASO 5.9 — Administración del contenido de la futura landing desde el ERP.
-- Fuente de verdad: BD/. Copia operativa: APP_ClinicaAMI/database/migrations/.

BEGIN;

ALTER TABLE tb_servicios
    ADD COLUMN IF NOT EXISTS visible_web BOOLEAN,
    ADD COLUMN IF NOT EXISTS orden_web INTEGER;

UPDATE tb_servicios
   SET visible_web = COALESCE(visible_web, estado),
       orden_web = COALESCE(orden_web, 0);

ALTER TABLE tb_servicios
    ALTER COLUMN visible_web SET DEFAULT FALSE,
    ALTER COLUMN visible_web SET NOT NULL,
    ALTER COLUMN orden_web SET DEFAULT 0,
    ALTER COLUMN orden_web SET NOT NULL;

ALTER TABLE tb_medicos
    ADD COLUMN IF NOT EXISTS visible_web BOOLEAN,
    ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS perfil_publico TEXT,
    ADD COLUMN IF NOT EXISTS orden_web INTEGER;

UPDATE tb_medicos
   SET visible_web = COALESCE(visible_web, estado),
       orden_web = COALESCE(orden_web, 0);

ALTER TABLE tb_medicos
    ALTER COLUMN visible_web SET DEFAULT FALSE,
    ALTER COLUMN visible_web SET NOT NULL,
    ALTER COLUMN orden_web SET DEFAULT 0,
    ALTER COLUMN orden_web SET NOT NULL;

ALTER TABLE tb_galeria
    ADD COLUMN IF NOT EXISTS orden_web INTEGER;

UPDATE tb_galeria
   SET orden_web = COALESCE(orden_web, 0);

ALTER TABLE tb_galeria
    ALTER COLUMN orden_web SET DEFAULT 0,
    ALTER COLUMN orden_web SET NOT NULL;

ALTER TABLE tb_estilos
    ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tb_servicios_orden_web') THEN
        ALTER TABLE tb_servicios
            ADD CONSTRAINT ck_tb_servicios_orden_web CHECK (orden_web >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tb_medicos_orden_web') THEN
        ALTER TABLE tb_medicos
            ADD CONSTRAINT ck_tb_medicos_orden_web CHECK (orden_web >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tb_galeria_orden_web') THEN
        ALTER TABLE tb_galeria
            ADD CONSTRAINT ck_tb_galeria_orden_web CHECK (orden_web >= 0);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS ix_tb_servicios_publicacion
    ON tb_servicios (visible_web, estado, orden_web, id);
CREATE INDEX IF NOT EXISTS ix_tb_medicos_publicacion
    ON tb_medicos (visible_web, estado, orden_web, id);
CREATE INDEX IF NOT EXISTS ix_tb_galeria_publicacion
    ON tb_galeria (estado, orden_web, id);
CREATE INDEX IF NOT EXISTS ix_tb_promociones_publicacion
    ON tb_promociones (estado, fecha_inicio, fecha_fin, id);
CREATE INDEX IF NOT EXISTS ix_tb_estilos_estado_nombre
    ON tb_estilos (estado, nombre, id);

-- Los usuarios administradores existentes reciben el módulo al aplicar la
-- migración. El seed repite esta regla para instalaciones nuevas.
INSERT INTO tb_permisos_rol (
    id_rol, modulo, puede_leer, puede_escribir, puede_borrar
)
SELECT id_rol, 'contenido_web', TRUE, TRUE, FALSE
  FROM tb_roles
 WHERE nombre_rol = 'Administrador'
ON CONFLICT (id_rol, modulo) DO UPDATE
SET puede_leer = EXCLUDED.puede_leer,
    puede_escribir = EXCLUDED.puede_escribir,
    puede_borrar = FALSE;

COMMENT ON COLUMN tb_servicios.visible_web IS
    'Controla la publicación del servicio sin modificar su disponibilidad clínica.';
COMMENT ON COLUMN tb_medicos.visible_web IS
    'Controla la publicación del profesional sin modificar su estado clínico.';
COMMENT ON COLUMN tb_medicos.perfil_publico IS
    'Semblanza administrable que podrá mostrarse en la futura landing.';
COMMENT ON COLUMN tb_galeria.orden_web IS
    'Prioridad ascendente de presentación en la futura landing.';

COMMIT;
