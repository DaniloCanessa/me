-- Marca del producto (sesión 44). Distinta del proveedor: el proveedor es a
-- quién se le compra (ej. distribuidor), la marca es el fabricante (Huawei,
-- JA Solar, BYD…). null = sin marca (los productos existentes no cambian).
ALTER TABLE products ADD COLUMN IF NOT EXISTS marca text;
