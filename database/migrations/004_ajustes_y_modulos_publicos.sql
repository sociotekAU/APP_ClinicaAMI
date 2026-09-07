BEGIN;

-- Los profesionales pueden cargarse inicialmente con su nombre y especialidad.
-- Los datos privados pendientes se completan posteriormente desde el panel.
ALTER TABLE tb_medicos ALTER COLUMN dpi DROP NOT NULL;
ALTER TABLE tb_medicos ALTER COLUMN numero_telefono DROP NOT NULL;
ALTER TABLE tb_medicos ALTER COLUMN correo DROP NOT NULL;
ALTER TABLE tb_medicos ALTER COLUMN fecha_inicio DROP NOT NULL;

-- Configuración pública y datos de contacto de la clínica.
CREATE TABLE IF NOT EXISTS tb_contacto (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_empresa VARCHAR(150) NOT NULL,
    nombre_corto VARCHAR(100),
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150),
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    logo_url VARCHAR(255),
    ubicacion VARCHAR(255) NOT NULL,
    google_maps_url VARCHAR(500),
    video_inicio_url VARCHAR(500),
    slogan VARCHAR(255),
    horario_semana TEXT,
    horario_sabado TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Solo puede existir una configuración de contacto activa.
CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_contacto_unico_activo
    ON tb_contacto ((1))
    WHERE estado = TRUE;

CREATE TABLE IF NOT EXISTS tb_galeria (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    definicion TEXT,
    imagen_url VARCHAR(500) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_promociones (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    imagen_url VARCHAR(500),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_tb_promociones_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE IF NOT EXISTS tb_estilos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    color_fondo VARCHAR(7) NOT NULL,
    color_texto VARCHAR(7) NOT NULL,
    icono VARCHAR(100),
    posicion VARCHAR(30) NOT NULL DEFAULT 'inferior_derecha',
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_tb_estilos_color_fondo
        CHECK (color_fondo ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT ck_tb_estilos_color_texto
        CHECK (color_texto ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE IF NOT EXISTS tb_anuncios (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estilo_id INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    imagen_url VARCHAR(500),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    promocion_id INTEGER,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_anuncios_estilo
        FOREIGN KEY (estilo_id)
        REFERENCES tb_estilos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_anuncios_promocion
        FOREIGN KEY (promocion_id)
        REFERENCES tb_promociones (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_anuncios_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS ix_tb_anuncios_estilo
    ON tb_anuncios (estilo_id);
CREATE INDEX IF NOT EXISTS ix_tb_anuncios_promocion
    ON tb_anuncios (promocion_id);
CREATE INDEX IF NOT EXISTS ix_tb_anuncios_vigencia
    ON tb_anuncios (estado, fecha_inicio, fecha_fin);

COMMENT ON TABLE tb_contacto IS 'Información pública de Alternativa Médica Integral A.M.I.';
COMMENT ON TABLE tb_galeria IS 'Recursos visuales publicados en la página.';
COMMENT ON TABLE tb_promociones IS 'Promociones con período de vigencia.';
COMMENT ON TABLE tb_estilos IS 'Estilos visuales reutilizables para anuncios.';
COMMENT ON TABLE tb_anuncios IS 'Anuncios emergentes opcionalmente vinculados a promociones.';

COMMIT;
