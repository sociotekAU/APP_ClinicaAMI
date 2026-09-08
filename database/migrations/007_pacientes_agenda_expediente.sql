BEGIN;

-- Asignación opcional de consultorio dentro de la agenda.
ALTER TABLE tb_citas
    ADD COLUMN IF NOT EXISTS id_clinica INTEGER;

UPDATE tb_citas c
   SET id_clinica = (
       SELECT MIN(cl.id_clinica)
         FROM tb_clinicas cl
        WHERE cl.id_doctor = c.id_doctor
          AND cl.estado = TRUE
   )
 WHERE c.id_clinica IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'fk_tb_citas_clinica'
           AND conrelid = 'tb_citas'::regclass
    ) THEN
        ALTER TABLE tb_citas
            ADD CONSTRAINT fk_tb_citas_clinica
            FOREIGN KEY (id_clinica)
            REFERENCES tb_clinicas (id_clinica)
            ON UPDATE CASCADE
            ON DELETE RESTRICT;
    END IF;
END;
$$;

-- Clasificación explícita para aislar expedientes generales y psicológicos.
ALTER TABLE tb_consultas
    ADD COLUMN IF NOT EXISTS tipo_expediente VARCHAR(20);

UPDATE tb_consultas co
   SET tipo_expediente = CASE
       WHEN EXISTS (
           SELECT 1
             FROM tb_citas c
             JOIN tb_medicos m ON m.id = c.id_doctor
             JOIN tb_especialidades e ON e.id = m.especialidad_id
            WHERE c.id_cita = co.id_cita
              AND LOWER(e.nombre) LIKE '%psicolog%'
       ) THEN 'psicologia'
       ELSE 'general'
   END
 WHERE co.tipo_expediente IS NULL;

ALTER TABLE tb_consultas
    ALTER COLUMN tipo_expediente SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'ck_tb_consultas_tipo_expediente'
           AND conrelid = 'tb_consultas'::regclass
    ) THEN
        ALTER TABLE tb_consultas
            ADD CONSTRAINT ck_tb_consultas_tipo_expediente
            CHECK (tipo_expediente IN ('general', 'psicologia'));
    END IF;
END;
$$;

-- Índices para listados estables del Paso 5.7.
CREATE INDEX IF NOT EXISTS ix_tb_pacientes_estado_id
    ON tb_pacientes (estado, id_paciente);
CREATE INDEX IF NOT EXISTS ix_tb_pacientes_apellidos_nombres_id
    ON tb_pacientes (apellidos, nombres, id_paciente);

CREATE INDEX IF NOT EXISTS ix_tb_clinicas_estado_id
    ON tb_clinicas (estado, id_clinica);

CREATE INDEX IF NOT EXISTS ix_tb_citas_estado_fecha_id
    ON tb_citas (estado, fecha_hora, id_cita);
CREATE INDEX IF NOT EXISTS ix_tb_citas_doctor_fecha_id
    ON tb_citas (id_doctor, fecha_hora, id_cita);
CREATE INDEX IF NOT EXISTS ix_tb_citas_paciente_fecha_id
    ON tb_citas (id_paciente, fecha_hora, id_cita);
CREATE INDEX IF NOT EXISTS ix_tb_citas_clinica_fecha_id
    ON tb_citas (id_clinica, fecha_hora, id_cita)
    WHERE id_clinica IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tb_consultas_tipo_fecha_id
    ON tb_consultas (tipo_expediente, fecha_registro DESC, id_consulta);
CREATE INDEX IF NOT EXISTS ix_tb_signos_consulta_fecha_id
    ON tb_signos_vitales_medidas (id_consulta, fecha_medicion DESC, id_medicion);

COMMENT ON COLUMN tb_citas.id_clinica IS
    'Consultorio asignado a la cita; puede quedar pendiente durante la programación.';
COMMENT ON COLUMN tb_consultas.tipo_expediente IS
    'Clasificación obligatoria para aislar el expediente general del psicológico.';

COMMIT;
