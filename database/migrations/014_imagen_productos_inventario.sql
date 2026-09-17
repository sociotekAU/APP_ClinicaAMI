-- Imagen pública opcional para los productos publicados desde inventario.
ALTER TABLE tb_insumos_inventario
    ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);

COMMENT ON COLUMN tb_insumos_inventario.imagen_url IS
    'Ruta local o URL http/https de la imagen pública del producto.';
