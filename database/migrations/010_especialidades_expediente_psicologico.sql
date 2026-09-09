-- UPDATE 5.8.2 — Elegibilidad administrable para expediente psicológico.
-- Fuente de verdad: BD/. Copia operativa: APP_ClinicaAMI/database/migrations/.

BEGIN;

ALTER TABLE tb_especialidades
    ADD COLUMN IF NOT EXISTS admite_expediente_psicologico BOOLEAN;

UPDATE tb_especialidades
   SET admite_expediente_psicologico = FALSE
 WHERE admite_expediente_psicologico IS NULL;

ALTER TABLE tb_especialidades
    ALTER COLUMN admite_expediente_psicologico SET DEFAULT FALSE,
    ALTER COLUMN admite_expediente_psicologico SET NOT NULL;

-- Configuración inicial solicitada. Las especialidades futuras se administran
-- desde el CRUD de Especialidades sin depender de coincidencias en el nombre.
UPDATE tb_especialidades
   SET admite_expediente_psicologico = TRUE
 WHERE LOWER(nombre) IN (
    LOWER('Psicología y Terapia de Lenguaje'),
    LOWER('Psiquiatría')
 );

COMMENT ON COLUMN tb_especialidades.admite_expediente_psicologico IS
    'Indica si los profesionales de la especialidad pueden generar expedientes psicológicos.';

COMMIT;
