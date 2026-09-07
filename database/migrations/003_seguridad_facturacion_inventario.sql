BEGIN;

-- Roles de acceso al sistema.
CREATE TABLE IF NOT EXISTS tb_roles (
    id_rol INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_rol VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_roles_nombre
    ON tb_roles (LOWER(nombre_rol));

-- Usuarios administrativos y clínicos.
CREATE TABLE IF NOT EXISTS tb_usuarios (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    id_rol INTEGER NOT NULL,
    id_doctor INTEGER,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    debe_cambiar_password BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_usuarios_rol
        FOREIGN KEY (id_rol)
        REFERENCES tb_roles (id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_usuarios_doctor
        FOREIGN KEY (id_doctor)
        REFERENCES tb_medicos (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_usuarios_username
    ON tb_usuarios (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_usuarios_correo
    ON tb_usuarios (LOWER(correo))
    WHERE correo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_usuarios_doctor
    ON tb_usuarios (id_doctor)
    WHERE id_doctor IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_tb_usuarios_rol
    ON tb_usuarios (id_rol);

-- Permisos por módulo. El borrado queda disponible en el modelo, pero los
-- seeds lo dejan deshabilitado para preservar historiales clínicos y contables.
CREATE TABLE IF NOT EXISTS tb_permisos_rol (
    id_rol INTEGER NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    puede_leer BOOLEAN NOT NULL DEFAULT FALSE,
    puede_escribir BOOLEAN NOT NULL DEFAULT FALSE,
    puede_borrar BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id_rol, modulo),
    CONSTRAINT fk_tb_permisos_rol
        FOREIGN KEY (id_rol)
        REFERENCES tb_roles (id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Facturas o recibos emitidos a pacientes.
CREATE TABLE IF NOT EXISTS tb_facturas (
    id_factura INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pagada',
    observaciones TEXT,
    CONSTRAINT fk_tb_facturas_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES tb_pacientes (id_paciente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_facturas_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES tb_usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_facturas_total CHECK (total >= 0),
    CONSTRAINT ck_tb_facturas_metodo
        CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
    CONSTRAINT ck_tb_facturas_estado
        CHECK (estado IN ('pagada', 'anulada'))
);

CREATE INDEX IF NOT EXISTS ix_tb_facturas_paciente
    ON tb_facturas (id_paciente);
CREATE INDEX IF NOT EXISTS ix_tb_facturas_usuario
    ON tb_facturas (id_usuario);
CREATE INDEX IF NOT EXISTS ix_tb_facturas_fecha
    ON tb_facturas (fecha_emision);

CREATE TABLE IF NOT EXISTS tb_detalle_factura (
    id_detalle INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_factura INTEGER NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    cantidad NUMERIC(10,2) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) GENERATED ALWAYS AS (
        ROUND(cantidad * precio_unitario, 2)
    ) STORED,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_tb_detalle_factura
        FOREIGN KEY (id_factura)
        REFERENCES tb_facturas (id_factura)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_detalle_factura_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_tb_detalle_factura_precio CHECK (precio_unitario >= 0)
);

CREATE INDEX IF NOT EXISTS ix_tb_detalle_factura
    ON tb_detalle_factura (id_factura);

-- Recalcula el total cada vez que cambia el detalle.
CREATE OR REPLACE FUNCTION fn_recalcular_total_factura()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    factura_actual INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        factura_actual := OLD.id_factura;
    ELSE
        factura_actual := NEW.id_factura;
    END IF;

    UPDATE tb_facturas
       SET total = COALESCE((
           SELECT SUM(subtotal)
             FROM tb_detalle_factura
            WHERE id_factura = factura_actual
              AND estado = TRUE
       ), 0)
     WHERE id_factura = factura_actual;

    IF TG_OP = 'UPDATE' AND OLD.id_factura <> NEW.id_factura THEN
        UPDATE tb_facturas
           SET total = COALESCE((
               SELECT SUM(subtotal)
                 FROM tb_detalle_factura
                WHERE id_factura = OLD.id_factura
                  AND estado = TRUE
           ), 0)
         WHERE id_factura = OLD.id_factura;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_total_factura ON tb_detalle_factura;
CREATE TRIGGER trg_recalcular_total_factura
AFTER INSERT OR UPDATE OR DELETE ON tb_detalle_factura
FOR EACH ROW
EXECUTE FUNCTION fn_recalcular_total_factura();

-- Proveedores de medicamentos, reactivos y materiales.
CREATE TABLE IF NOT EXISTS tb_proveedores (
    id_proveedor INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_empresa VARCHAR(150) NOT NULL,
    contacto VARCHAR(150),
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150),
    direccion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_proveedores_nombre
    ON tb_proveedores (LOWER(nombre_empresa));

-- Catálogo y existencia actual de insumos.
CREATE TABLE IF NOT EXISTS tb_insumos_inventario (
    id_insumo INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    id_proveedor INTEGER,
    id_medicamento INTEGER,
    stock_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_costo NUMERIC(12,2) NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidad',
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_insumos_proveedor
        FOREIGN KEY (id_proveedor)
        REFERENCES tb_proveedores (id_proveedor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_insumos_medicamento
        FOREIGN KEY (id_medicamento)
        REFERENCES tb_medicamentos (id_medicamento)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_insumos_tipo
        CHECK (tipo IN ('medicamento', 'reactivo_laboratorio', 'material_clinico')),
    CONSTRAINT ck_tb_insumos_stock CHECK (stock_actual >= 0),
    CONSTRAINT ck_tb_insumos_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT ck_tb_insumos_precio CHECK (precio_costo >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tb_insumos_nombre_tipo
    ON tb_insumos_inventario (LOWER(nombre), tipo);
CREATE INDEX IF NOT EXISTS ix_tb_insumos_proveedor
    ON tb_insumos_inventario (id_proveedor);
CREATE INDEX IF NOT EXISTS ix_tb_insumos_medicamento
    ON tb_insumos_inventario (id_medicamento);

-- Kardex de inventario.
CREATE TABLE IF NOT EXISTS tb_movimientos_inventario (
    id_movimiento INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_insumo INTEGER NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL,
    observaciones TEXT,
    CONSTRAINT fk_tb_movimientos_insumo
        FOREIGN KEY (id_insumo)
        REFERENCES tb_insumos_inventario (id_insumo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_movimientos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES tb_usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_movimientos_tipo
        CHECK (tipo_movimiento IN ('entrada', 'salida', 'merma')),
    CONSTRAINT ck_tb_movimientos_cantidad CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS ix_tb_movimientos_insumo
    ON tb_movimientos_inventario (id_insumo);
CREATE INDEX IF NOT EXISTS ix_tb_movimientos_usuario
    ON tb_movimientos_inventario (id_usuario);
CREATE INDEX IF NOT EXISTS ix_tb_movimientos_fecha
    ON tb_movimientos_inventario (fecha);

-- Aplica cada movimiento al stock y evita existencias negativas.
CREATE OR REPLACE FUNCTION fn_aplicar_movimiento_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    existencia NUMERIC(12,2);
    nueva_existencia NUMERIC(12,2);
BEGIN
    SELECT stock_actual
      INTO existencia
      FROM tb_insumos_inventario
     WHERE id_insumo = NEW.id_insumo
       AND estado = TRUE
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El insumo no existe o está inactivo.';
    END IF;

    IF NEW.tipo_movimiento = 'entrada' THEN
        nueva_existencia := existencia + NEW.cantidad;
    ELSE
        nueva_existencia := existencia - NEW.cantidad;
    END IF;

    IF nueva_existencia < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para registrar el movimiento.';
    END IF;

    UPDATE tb_insumos_inventario
       SET stock_actual = nueva_existencia
     WHERE id_insumo = NEW.id_insumo;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aplicar_movimiento_inventario
    ON tb_movimientos_inventario;
CREATE TRIGGER trg_aplicar_movimiento_inventario
BEFORE INSERT ON tb_movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION fn_aplicar_movimiento_inventario();

-- Un movimiento contable de inventario no se edita ni se elimina; se corrige
-- creando un movimiento compensatorio.
CREATE OR REPLACE FUNCTION fn_bloquear_cambio_movimiento_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Los movimientos de inventario no se editan ni eliminan; registre un movimiento compensatorio.';
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_cambio_movimiento_inventario
    ON tb_movimientos_inventario;
CREATE TRIGGER trg_bloquear_cambio_movimiento_inventario
BEFORE UPDATE OR DELETE ON tb_movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION fn_bloquear_cambio_movimiento_inventario();

-- Imágenes y documentos asociados al expediente.
CREATE TABLE IF NOT EXISTS tb_archivos_estudios (
    id_archivo INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente INTEGER NOT NULL,
    id_consulta INTEGER NOT NULL,
    tipo_estudio VARCHAR(100) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL,
    descripcion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_tb_archivos_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES tb_pacientes (id_paciente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_archivos_consulta
        FOREIGN KEY (id_consulta)
        REFERENCES tb_consultas (id_consulta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_archivos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES tb_usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_tb_archivos_paciente
    ON tb_archivos_estudios (id_paciente);
CREATE INDEX IF NOT EXISTS ix_tb_archivos_consulta
    ON tb_archivos_estudios (id_consulta);

-- Consentimientos requeridos para procedimientos clínicos.
CREATE TABLE IF NOT EXISTS tb_consentimientos_informados (
    id_consentimiento INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente INTEGER NOT NULL,
    id_servicio INTEGER NOT NULL,
    fecha_firma TIMESTAMP,
    estado_firma VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    ruta_documento VARCHAR(500),
    id_usuario INTEGER,
    observaciones TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_consentimientos_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES tb_pacientes (id_paciente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_consentimientos_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES tb_servicios (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_tb_consentimientos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES tb_usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT ck_tb_consentimientos_estado
        CHECK (estado_firma IN ('pendiente', 'firmado', 'rechazado', 'revocado')),
    CONSTRAINT ck_tb_consentimientos_fecha
        CHECK (estado_firma <> 'firmado' OR fecha_firma IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_tb_consentimientos_paciente
    ON tb_consentimientos_informados (id_paciente);
CREATE INDEX IF NOT EXISTS ix_tb_consentimientos_servicio
    ON tb_consentimientos_informados (id_servicio);

COMMENT ON TABLE tb_roles IS 'Roles del sistema para control de acceso.';
COMMENT ON TABLE tb_usuarios IS 'Usuarios administrativos y clínicos autenticables.';
COMMENT ON TABLE tb_permisos_rol IS 'Permisos de lectura, escritura y borrado por rol y módulo.';
COMMENT ON TABLE tb_facturas IS 'Facturas o recibos cobrados a pacientes.';
COMMENT ON TABLE tb_detalle_factura IS 'Conceptos cobrados en una factura.';
COMMENT ON TABLE tb_proveedores IS 'Proveedores de insumos de la clínica.';
COMMENT ON TABLE tb_insumos_inventario IS 'Catálogo y existencia actual de insumos.';
COMMENT ON TABLE tb_movimientos_inventario IS 'Kardex inmutable de entradas, salidas y mermas.';
COMMENT ON TABLE tb_archivos_estudios IS 'Archivos auxiliares vinculados al expediente clínico.';
COMMENT ON TABLE tb_consentimientos_informados IS 'Consentimientos asociados a pacientes y servicios.';

COMMIT;
