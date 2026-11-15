-- =============================================================
-- AseptiQ — Schema consolidado v2.5.2
-- Instalación LIMPIA de punta a punta. Reemplaza:
--   · schema.sql (v2.4.0)
--   · blindaje_seguridad.sql
--   · parche_seguridad.sql
--   · v2.5.0_auditoria.sql
--   · v2.5.1_cajas_fifo_recursivo.sql
--   · registrar_entrega_op.sql
-- NO correr los archivos viejos sobre esta base.
--
-- Cambios clave vs. versiones anteriores:
--   · validar_escritura() definida al inicio
--   · REVOKEs de funciones al final (idempotente)
--   · RLS: escritura solo en catálogo, nunca en movimientos/lotes/entregas/despachos
--   · Column-grants: existencia_actual y costo_unitario no escribibles directo
--   · registrar_entrada absorbe factura, OC, calidad y observaciones
--   · consumir_insumo_fifo: valida stock + lockea + maneja SIN LOTE
--   · consumir_subproducto_recursivo: consistencia de existencia y Kardex
--   · simular_consumo_pt: agrega requerimientos sin doble conteo (reemplaza planificar)
--   · ajustar_inventario: no delega a registrar_entrada en rama positiva
--   · registrar_devolucion: NULLIF(lote) + valida saldo real
--   · guardar_subproducto: detecta ciclos contra p_hijos (no solo aristas viejas)
--   · siguiente_codigo: 4 dígitos, unificado con JS
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- SECCIÓN 1 · TABLAS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  unidad_medida text NOT NULL,
  existencia_actual numeric NOT NULL DEFAULT 0 CHECK (existencia_actual >= 0),
  punto_reorden numeric NOT NULL DEFAULT 0 CHECK (punto_reorden > 0),
  estado_activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  unidad_consumo text,
  factor_conversion numeric,
  unidad_secundaria text,
  factor_secundario numeric,
  costo_unitario numeric NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  conversiones jsonb NOT NULL DEFAULT '[]'::jsonb,
  tipo_conversion text NOT NULL DEFAULT 'fijo'
    CHECK (tipo_conversion = ANY (ARRAY['fijo','dimensional','variable']))
);

CREATE TABLE IF NOT EXISTS public.productos_terminados (
  codigo_pt text PRIMARY KEY,
  nombre text NOT NULL,
  estado_activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  unidades_por_caja integer NOT NULL DEFAULT 1 CHECK (unidades_por_caja >= 1),
  existencia_actual numeric NOT NULL DEFAULT 0 CHECK (existencia_actual >= 0),
  precio_venta numeric CHECK (precio_venta IS NULL OR precio_venta >= 0),
  codigo_barras text,
  plantilla_etiqueta text DEFAULT 'esteril_proclides'
    CHECK (plantilla_etiqueta IN ('esteril_proclides','esteril_allmed','noesteril_allmed','noesteril_proclides_grande','noesteril_proclides_mediana')),
  vida_util_meses integer DEFAULT 35,
  registro_invima text
);

CREATE TABLE IF NOT EXISTS public.subproductos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  estado_activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  existencia_actual numeric NOT NULL DEFAULT 0 CHECK (existencia_actual >= 0),
  punto_reorden numeric DEFAULT 0 CHECK (punto_reorden IS NULL OR punto_reorden >= 0),
  tipo text NOT NULL DEFAULT 'ambos' CHECK (tipo = ANY (ARRAY['intermedio','final','ambos']))
);

CREATE TABLE IF NOT EXISTS public.sys_proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nit text NOT NULL UNIQUE,
  razon_social text NOT NULL,
  contacto text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  direccion text,
  contactos jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.bom_recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id),
  cantidad_por_unidad numeric NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subproducto_recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subproducto_id uuid NOT NULL REFERENCES public.subproductos(id),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id),
  cantidad_por_unidad numeric NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  unidad_receta text,
  factor_receta numeric NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.subproducto_subproductos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subproducto_padre_id uuid NOT NULL REFERENCES public.subproductos(id),
  subproducto_hijo_id uuid NOT NULL REFERENCES public.subproductos(id),
  cantidad_por_unidad numeric NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (subproducto_padre_id <> subproducto_hijo_id)
);

CREATE TABLE IF NOT EXISTS public.paquete_subproductos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  subproducto_id uuid NOT NULL REFERENCES public.subproductos(id),
  cantidad numeric NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ordenes_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  cantidad_proyectada numeric NOT NULL CHECK (cantidad_proyectada > 0),
  estado_cobertura text NOT NULL DEFAULT 'Cubierta',
  detalle_faltantes jsonb,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  numero_op text,
  estado_op text NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_op = ANY (ARRAY['Pendiente','En proceso','Terminada','Cancelada'])),
  cantidad_cajas numeric,
  fecha_completado timestamptz,
  fecha_cancelado timestamptz,
  motivo_cancelacion text,
  lote text,
  prioridad integer,
  fecha_programada date,
  fecha_fin_programada date,
  cantidad_producida numeric NOT NULL DEFAULT 0 CHECK (cantidad_producida >= 0),
  fecha_ultima_entrega timestamptz
);

CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid REFERENCES public.insumos(id),
  subproducto_id uuid REFERENCES public.subproductos(id),
  tipo text NOT NULL DEFAULT 'Entrada',
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  proveedor_id uuid REFERENCES public.sys_proveedores(id),
  fecha timestamptz NOT NULL DEFAULT now(),
  motivo text,
  rendimiento_real numeric,
  unidad_compra text,
  cantidad_compra numeric,
  orden_id uuid REFERENCES public.ordenes_semanales(id),
  costo_unitario_momento numeric,
  lote_insumo text,
  estado_calidad text DEFAULT 'Aprobado'
    CHECK (estado_calidad IS NULL OR estado_calidad IN ('Aprobado','Rechazado','Cuarentena')),
  observaciones_calidad text,
  numero_factura text,
  numero_oc text,
  numero_entrada_almacen text,
  cantidad_pendiente_oc numeric,
  CONSTRAINT mov_inv_insumo_o_subproducto_check
    CHECK (insumo_id IS NOT NULL OR subproducto_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.entregas_op (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_semanales(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  lote_entrega text,
  motivo text,
  usuario_id uuid,
  usuario_email text,
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ajustes_costo_insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  costo_anterior numeric NOT NULL,
  costo_nuevo numeric NOT NULL,
  motivo text,
  usuario_id uuid,
  usuario_email text,
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nombre text,
  role text NOT NULL DEFAULT 'consulta'
    CHECK (role = ANY (ARRAY['admin','operador','consulta'])),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid,
  usuario_email text,
  tablas_incluidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  rango_movimientos text,
  total_registros integer NOT NULL DEFAULT 0,
  tamano_bytes bigint,
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.insumo_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  lote text NOT NULL,
  cantidad_recibida numeric NOT NULL DEFAULT 0,
  cantidad_actual numeric NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0),
  costo_unitario numeric,
  proveedor_id uuid REFERENCES public.sys_proveedores(id) ON DELETE SET NULL,
  primer_ingreso timestamptz NOT NULL DEFAULT now(),
  ultimo_ingreso timestamptz NOT NULL DEFAULT now(),
  notas text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (insumo_id, lote)
);

CREATE TABLE IF NOT EXISTS public.etiquetas_impresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text REFERENCES public.productos_terminados(codigo_pt) ON DELETE CASCADE,
  lote text,
  cantidad_paquetes int,
  cantidad_cajas int,
  usuario_email text,
  fecha timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.devoluciones_pt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  estado_producto text NOT NULL DEFAULT 'bueno' CHECK (estado_producto IN ('bueno','dañado','cuarentena')),
  motivo text,
  usuario_id uuid,
  usuario_email text,
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluaciones_proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid REFERENCES public.sys_proveedores(id) ON DELETE CASCADE,
  proveedor_nombre text,
  proveedor_nit text,
  fecha date DEFAULT CURRENT_DATE,
  evaluador_email text,
  nota_entrega numeric(3,1) DEFAULT 5.0,
  nota_calidad numeric(3,1) DEFAULT 5.0,
  nota_postventa numeric(3,1) DEFAULT 5.0,
  nota_fumigacion numeric(3,1) DEFAULT 5.0,
  nota_precio numeric(3,1) DEFAULT 5.0,
  promedio numeric(3,2),
  resultado text,
  observaciones text,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.despachos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text REFERENCES public.productos_terminados(codigo_pt) ON DELETE CASCADE,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  lote_op text,
  consecutivo text,
  oc text,
  cliente text NOT NULL,
  fecha date DEFAULT CURRENT_DATE,
  fecha_vencimiento text,
  observaciones text,
  usuario_email text,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cajas_ubicacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_caja text UNIQUE NOT NULL,
  codigo_pt text REFERENCES public.productos_terminados(codigo_pt) ON DELETE CASCADE,
  ubicacion text NOT NULL,
  estado text DEFAULT 'En bodega',
  usuario_email text,
  actualizado_en timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_por uuid,
  actualizado_por_email text
);

-- =============================================================
-- SECCIÓN 2 · ÍNDICES
-- =============================================================

CREATE UNIQUE INDEX IF NOT EXISTS ordenes_semanales_numero_op_unique
  ON public.ordenes_semanales (numero_op) WHERE numero_op IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ordenes_semanales_lote_unique
  ON public.ordenes_semanales (lote) WHERE lote IS NOT NULL;
CREATE INDEX IF NOT EXISTS ordenes_semanales_prioridad_idx
  ON public.ordenes_semanales (prioridad NULLS LAST, fecha_programada NULLS LAST, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS movimientos_inventario_orden_idx
  ON public.movimientos_inventario (orden_id) WHERE orden_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS movimientos_inventario_fecha_id_idx
  ON public.movimientos_inventario (fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS movimientos_inventario_insumo_idx
  ON public.movimientos_inventario (insumo_id, fecha DESC, id DESC)
  WHERE insumo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS entregas_op_orden_idx
  ON public.entregas_op (orden_id, fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS ajustes_costo_insumo_fecha_idx
  ON public.ajustes_costo_insumo (fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS insumo_lotes_insumo_lote_idx
  ON public.insumo_lotes (insumo_id, lote);
-- Acelera siguiente_codigo: extrae el sufijo numérico para MAX()
CREATE INDEX IF NOT EXISTS insumos_sufijo_num_idx
  ON public.insumos ((NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::bigint))
  WHERE codigo ~ '\d';
CREATE INDEX IF NOT EXISTS subproductos_sufijo_num_idx
  ON public.subproductos ((NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::bigint))
  WHERE codigo ~ '\d';
CREATE INDEX IF NOT EXISTS productos_terminados_sufijo_num_idx
  ON public.productos_terminados ((NULLIF(regexp_replace(codigo_pt, '\D', '', 'g'), '')::bigint))
  WHERE codigo_pt ~ '\d';

-- =============================================================
-- SECCIÓN 3 · HELPERS (definidos ANTES de los RPCs)
-- =============================================================

-- Rol del usuario con detección de inactivos (fix #13).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN activo THEN role ELSE 'inactivo' END
     FROM public.profiles WHERE user_id = auth.uid()),
    'anon'
  );
$$;

-- Guard de escritura (fix #3: ahora sí está en schema).
CREATE OR REPLACE FUNCTION public.validar_escritura()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.current_user_role() NOT IN ('admin','operador') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de operador o administrador.';
  END IF;
END; $$;

-- Email del usuario actual (helper usado por varios RPCs).
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Siguiente código 4 dígitos (unificado con JS, fix A4).
CREATE OR REPLACE FUNCTION public.siguiente_codigo(p_prefijo text, p_tabla text)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE v_max bigint := 0;
BEGIN
  IF p_tabla = 'insumos' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(codigo FROM char_length(p_prefijo)+1), '\D','','g'),'')::bigint), 0)
      INTO v_max FROM public.insumos WHERE codigo LIKE p_prefijo || '%';
  ELSIF p_tabla = 'subproductos' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(codigo FROM char_length(p_prefijo)+1), '\D','','g'),'')::bigint), 0)
      INTO v_max FROM public.subproductos WHERE codigo LIKE p_prefijo || '%';
  ELSIF p_tabla = 'productos_terminados' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(codigo_pt FROM char_length(p_prefijo)+1), '\D','','g'),'')::bigint), 0)
      INTO v_max FROM public.productos_terminados WHERE codigo_pt LIKE p_prefijo || '%';
  ELSE
    RAISE EXCEPTION 'Tabla no soportada por siguiente_codigo: %', p_tabla;
  END IF;
  RETURN lpad((v_max + 1)::text, 4, '0');
END; $$;

-- Costo recursivo de subproducto (con protección de ciclos y depth limit).
CREATE OR REPLACE FUNCTION public.subproducto_costo(
  p_sub_id uuid, p_visited uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE rec numeric := 0; hijos numeric := 0;
BEGIN
  IF p_sub_id = ANY(p_visited) OR array_length(p_visited,1) > 20 THEN RETURN 0; END IF;
  SELECT COALESCE(SUM(
    (SELECT costo_unitario FROM public.insumos WHERE id = sr.insumo_id)
    * sr.cantidad_por_unidad * COALESCE(sr.factor_receta, 1)
  ), 0) INTO rec FROM public.subproducto_recetas sr WHERE sr.subproducto_id = p_sub_id;
  SELECT COALESCE(SUM(
    public.subproducto_costo(ss.subproducto_hijo_id, p_visited || p_sub_id) * ss.cantidad_por_unidad
  ), 0) INTO hijos FROM public.subproducto_subproductos ss WHERE ss.subproducto_padre_id = p_sub_id;
  RETURN rec + hijos;
END; $$;

CREATE OR REPLACE FUNCTION public.paquete_costo(p_pt text)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE ins_directos numeric := 0; subs numeric := 0;
BEGIN
  SELECT COALESCE(SUM(
    (SELECT costo_unitario FROM public.insumos WHERE id = br.insumo_id) * br.cantidad_por_unidad
  ), 0) INTO ins_directos FROM public.bom_recetas br WHERE br.codigo_pt = p_pt;
  SELECT COALESCE(SUM(
    public.subproducto_costo(ps.subproducto_id) * ps.cantidad
  ), 0) INTO subs FROM public.paquete_subproductos ps WHERE ps.codigo_pt = p_pt;
  RETURN ins_directos + subs;
END; $$;

CREATE OR REPLACE FUNCTION public.costos_todos()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_sub_costo jsonb; v_paq_costo jsonb;
BEGIN
  SELECT jsonb_object_agg(s.id::text, public.subproducto_costo(s.id)) INTO v_sub_costo FROM public.subproductos s;
  SELECT jsonb_object_agg(p.codigo_pt, public.paquete_costo(p.codigo_pt)) INTO v_paq_costo FROM public.productos_terminados p;
  RETURN jsonb_build_object(
    'subproducto_costo', COALESCE(v_sub_costo, '{}'::jsonb),
    'paquete_costo', COALESCE(v_paq_costo, '{}'::jsonb)
  );
END; $$;

-- =============================================================
-- SECCIÓN 4 · FIFO Y CONSUMOS (núcleo)
-- =============================================================

-- FIFO con: lock de insumo, check de stock, manejo correcto de SIN LOTE,
-- y p_tipo para 'Consumo' vs 'Salida' (fixes #8 y #12).
DROP FUNCTION IF EXISTS public.consumir_insumo_fifo(uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.consumir_insumo_fifo(uuid, numeric, text, uuid, text);
CREATE OR REPLACE FUNCTION public.consumir_insumo_fifo(
  p_insumo_id uuid, p_cantidad numeric, p_motivo text,
  p_orden_id uuid DEFAULT NULL, p_tipo text DEFAULT 'Consumo'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_restante numeric := p_cantidad;
  v_tomar numeric;
  v_lote record;
  v_detalle jsonb := '[]'::jsonb;
  v_costo numeric;
  v_stock numeric;
  v_lotes_reales int;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'Cantidad debe ser > 0';
  END IF;
  IF p_tipo NOT IN ('Consumo','Salida') THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido: %', p_tipo;
  END IF;

  -- Lock + check de stock
  SELECT existencia_actual, costo_unitario INTO v_stock, v_costo
    FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado: %', p_insumo_id; END IF;
  IF v_stock < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para insumo %: disponible %, requerido %',
      p_insumo_id, v_stock, p_cantidad;
  END IF;

  -- ¿Maneja lotes reales?
  SELECT COUNT(*) INTO v_lotes_reales FROM public.insumo_lotes
    WHERE insumo_id = p_insumo_id AND cantidad_actual > 0 AND lote <> 'SIN LOTE';

  IF v_lotes_reales = 0 THEN
    -- Sin lotes reales: decrementar SIN LOTE si existe, para no dejar fantasma
    UPDATE public.insumo_lotes
      SET cantidad_actual = GREATEST(0, cantidad_actual - p_cantidad)
      WHERE insumo_id = p_insumo_id AND lote = 'SIN LOTE';
    INSERT INTO public.movimientos_inventario
      (insumo_id, tipo, cantidad, motivo, orden_id, lote_insumo, costo_unitario_momento)
    VALUES (p_insumo_id, p_tipo, p_cantidad, p_motivo, p_orden_id, 'SIN LOTE', v_costo);
    UPDATE public.insumos SET existencia_actual = existencia_actual - p_cantidad
      WHERE id = p_insumo_id;
    RETURN jsonb_build_object('consumo_detalle',
      jsonb_build_array(jsonb_build_object('lote','SIN LOTE','cantidad',p_cantidad)));
  END IF;

  -- FIFO estricto
  FOR v_lote IN
    SELECT id, lote, cantidad_actual, costo_unitario
    FROM public.insumo_lotes
    WHERE insumo_id = p_insumo_id AND cantidad_actual > 0 AND lote <> 'SIN LOTE'
    ORDER BY primer_ingreso ASC, id ASC
  LOOP
    IF v_restante <= 0 THEN EXIT; END IF;
    v_tomar := LEAST(v_restante, v_lote.cantidad_actual);
    UPDATE public.insumo_lotes SET cantidad_actual = cantidad_actual - v_tomar
      WHERE id = v_lote.id;
    INSERT INTO public.movimientos_inventario
      (insumo_id, tipo, cantidad, motivo, orden_id, lote_insumo, costo_unitario_momento)
    VALUES (p_insumo_id, p_tipo, v_tomar, p_motivo, p_orden_id, v_lote.lote,
      COALESCE(v_lote.costo_unitario, v_costo));
    v_restante := v_restante - v_tomar;
    v_detalle := v_detalle || jsonb_build_object('lote', v_lote.lote, 'cantidad', v_tomar);
  END LOOP;

  IF v_restante > 0 THEN
    -- Fallback a SIN LOTE (evita stock fantasma)
    UPDATE public.insumo_lotes
      SET cantidad_actual = GREATEST(0, cantidad_actual - v_restante)
      WHERE insumo_id = p_insumo_id AND lote = 'SIN LOTE';
    INSERT INTO public.movimientos_inventario
      (insumo_id, tipo, cantidad, motivo, orden_id, lote_insumo, costo_unitario_momento)
    VALUES (p_insumo_id, p_tipo, v_restante, p_motivo, p_orden_id, 'SIN LOTE', v_costo);
    v_detalle := v_detalle || jsonb_build_object('lote', 'SIN LOTE', 'cantidad', v_restante);
  END IF;

  UPDATE public.insumos SET existencia_actual = existencia_actual - p_cantidad
    WHERE id = p_insumo_id;
  RETURN jsonb_build_object('consumo_detalle', v_detalle);
END; $$;

-- Consumo recursivo de subproductos con consistencia de existencia
-- (fix C2: la Entrada virtual del auto-producido va acompañada de su Consumo
-- para que Kardex y existencia siempre cuadren).
CREATE OR REPLACE FUNCTION public.consumir_subproducto_recursivo(
  p_sub_id uuid, p_cantidad numeric, p_orden_id uuid DEFAULT NULL,
  p_visited uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_sub record;
  v_stock numeric;
  v_faltante numeric;
  v_receta record;
  v_hijo record;
  v_consumido_de_stock numeric := 0;
BEGIN
  IF p_sub_id = ANY(p_visited) THEN
    RAISE EXCEPTION 'Ciclo detectado en subproductos (id=%)', p_sub_id;
  END IF;
  IF array_length(p_visited,1) > 20 THEN
    RAISE EXCEPTION 'Profundidad máxima de subproductos excedida (id=%)', p_sub_id;
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RETURN jsonb_build_object('consumido_de_stock', 0, 'auto_producido', 0);
  END IF;

  SELECT * INTO v_sub FROM public.subproductos WHERE id = p_sub_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subproducto no encontrado: %', p_sub_id; END IF;
  v_stock := COALESCE(v_sub.existencia_actual, 0);

  IF v_stock >= p_cantidad THEN
    UPDATE public.subproductos SET existencia_actual = existencia_actual - p_cantidad WHERE id = p_sub_id;
    INSERT INTO public.movimientos_inventario (subproducto_id, tipo, cantidad, motivo, orden_id)
    VALUES (p_sub_id, 'Consumo', p_cantidad, 'Consumo OP', p_orden_id);
    RETURN jsonb_build_object('consumido_de_stock', p_cantidad, 'auto_producido', 0);
  END IF;

  IF v_stock > 0 THEN
    UPDATE public.subproductos SET existencia_actual = 0 WHERE id = p_sub_id;
    INSERT INTO public.movimientos_inventario (subproducto_id, tipo, cantidad, motivo, orden_id)
    VALUES (p_sub_id, 'Consumo', v_stock, 'Consumo OP', p_orden_id);
    v_consumido_de_stock := v_stock;
  END IF;
  v_faltante := p_cantidad - v_stock;

  -- Hijos primero (recursivo)
  FOR v_hijo IN SELECT subproducto_hijo_id, cantidad_por_unidad
                FROM public.subproducto_subproductos
                WHERE subproducto_padre_id = p_sub_id LOOP
    PERFORM public.consumir_subproducto_recursivo(
      v_hijo.subproducto_hijo_id,
      v_hijo.cantidad_por_unidad * v_faltante,
      p_orden_id,
      p_visited || p_sub_id
    );
  END LOOP;

  -- Insumos de la receta (FIFO)
  FOR v_receta IN SELECT insumo_id, cantidad_por_unidad, factor_receta
                  FROM public.subproducto_recetas WHERE subproducto_id = p_sub_id LOOP
    PERFORM public.consumir_insumo_fifo(
      v_receta.insumo_id,
      v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta,1) * v_faltante,
      'Auto-producción OP',
      p_orden_id,
      'Consumo'
    );
  END LOOP;

  -- Auto-producción VIRTUAL: Entrada + Consumo para preservar Kardex ↔ existencia
  UPDATE public.subproductos SET existencia_actual = existencia_actual + v_faltante WHERE id = p_sub_id;
  INSERT INTO public.movimientos_inventario (subproducto_id, tipo, cantidad, motivo, orden_id)
  VALUES (p_sub_id, 'Entrada', v_faltante, 'Auto-producción OP', p_orden_id);
  UPDATE public.subproductos SET existencia_actual = existencia_actual - v_faltante WHERE id = p_sub_id;
  INSERT INTO public.movimientos_inventario (subproducto_id, tipo, cantidad, motivo, orden_id)
  VALUES (p_sub_id, 'Consumo', v_faltante, 'Auto-producción OP', p_orden_id);

  RETURN jsonb_build_object('consumido_de_stock', v_consumido_de_stock, 'auto_producido', v_faltante);
END; $$;

-- Simulación consolidada (fix #12: acumula stock virtual a través del árbol,
-- reemplaza planificar_consumo_subproducto evitando doble conteo).
DROP FUNCTION IF EXISTS public.planificar_consumo_subproducto(uuid, numeric, uuid[]);
CREATE OR REPLACE FUNCTION public.simular_consumo_pt(p_codigo_pt text, p_cantidad numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_state jsonb := jsonb_build_object('sub_stock', '{}'::jsonb, 'insumo_req', '{}'::jsonb);
  v_sub record;
  v_ins record;
BEGIN
  -- Subproductos del paquete
  FOR v_sub IN SELECT subproducto_id, cantidad FROM public.paquete_subproductos
               WHERE codigo_pt = p_codigo_pt LOOP
    v_state := public.simular_consumo_subproducto(
      v_sub.subproducto_id, v_sub.cantidad * p_cantidad, v_state, ARRAY[]::uuid[]
    );
  END LOOP;
  -- Insumos directos del paquete
  FOR v_ins IN SELECT insumo_id, cantidad_por_unidad FROM public.bom_recetas
               WHERE codigo_pt = p_codigo_pt LOOP
    v_state := jsonb_set(
      v_state, ARRAY['insumo_req', v_ins.insumo_id::text],
      to_jsonb(COALESCE((v_state->'insumo_req'->>v_ins.insumo_id::text)::numeric, 0)
               + v_ins.cantidad_por_unidad * p_cantidad)
    );
  END LOOP;
  RETURN v_state;
END; $$;

CREATE OR REPLACE FUNCTION public.simular_consumo_subproducto(
  p_sub_id uuid, p_cantidad numeric, p_state jsonb,
  p_visited uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_stock_actual numeric;
  v_faltante numeric;
  v_receta record;
  v_hijo record;
  v_stock_map jsonb := COALESCE(p_state->'sub_stock', '{}'::jsonb);
  v_insumo_req jsonb := COALESCE(p_state->'insumo_req', '{}'::jsonb);
  v_key text;
BEGIN
  IF p_sub_id = ANY(p_visited) THEN
    RAISE EXCEPTION 'Ciclo detectado en subproductos';
  END IF;
  IF array_length(p_visited,1) > 20 THEN
    RAISE EXCEPTION 'Profundidad máxima excedida';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RETURN p_state; END IF;

  v_key := p_sub_id::text;
  IF v_stock_map ? v_key THEN
    v_stock_actual := (v_stock_map->>v_key)::numeric;
  ELSE
    SELECT existencia_actual INTO v_stock_actual FROM public.subproductos WHERE id = p_sub_id;
    v_stock_actual := COALESCE(v_stock_actual, 0);
    v_stock_map := jsonb_set(v_stock_map, ARRAY[v_key], to_jsonb(v_stock_actual));
  END IF;

  IF v_stock_actual >= p_cantidad THEN
    v_stock_map := jsonb_set(v_stock_map, ARRAY[v_key], to_jsonb(v_stock_actual - p_cantidad));
    RETURN jsonb_set(p_state, '{sub_stock}', v_stock_map);
  END IF;

  v_faltante := p_cantidad - v_stock_actual;
  v_stock_map := jsonb_set(v_stock_map, ARRAY[v_key], '0'::jsonb);

  FOR v_hijo IN SELECT subproducto_hijo_id, cantidad_por_unidad
                FROM public.subproducto_subproductos WHERE subproducto_padre_id = p_sub_id LOOP
    p_state := public.simular_consumo_subproducto(
      v_hijo.subproducto_hijo_id,
      v_hijo.cantidad_por_unidad * v_faltante,
      p_state || jsonb_build_object('sub_stock', v_stock_map),
      p_visited || p_sub_id
    );
    v_stock_map := p_state->'sub_stock';
    v_insumo_req := p_state->'insumo_req';
  END LOOP;

  FOR v_receta IN SELECT insumo_id, cantidad_por_unidad, factor_receta
                  FROM public.subproducto_recetas WHERE subproducto_id = p_sub_id LOOP
    v_key := v_receta.insumo_id::text;
    v_insumo_req := jsonb_set(v_insumo_req, ARRAY[v_key],
      to_jsonb(COALESCE((v_insumo_req->>v_key)::numeric, 0)
               + v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta,1) * v_faltante));
  END LOOP;

  RETURN jsonb_build_object('sub_stock', v_stock_map, 'insumo_req', v_insumo_req);
END; $$;

-- =============================================================
-- SECCIÓN 5 · RPCs DE INVENTARIO
-- =============================================================

-- registrar_entrada: absorbe calidad + documentos (elimina los PATCH frágiles).
-- Fixes #4, #12, A5.
DROP FUNCTION IF EXISTS public.registrar_entrada(uuid, numeric, uuid, numeric, text, numeric);
DROP FUNCTION IF EXISTS public.registrar_entrada(uuid, numeric, uuid, numeric, text, numeric, text);
DROP FUNCTION IF EXISTS public.registrar_entrada(uuid, numeric, uuid, numeric, text, numeric, text, text);
CREATE OR REPLACE FUNCTION public.registrar_entrada(
  p_insumo_id uuid, p_cantidad numeric,
  p_proveedor_id uuid DEFAULT NULL,
  p_costo_unitario numeric DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_rendimiento_real numeric DEFAULT NULL,
  p_lote_insumo text DEFAULT NULL,
  p_estado_calidad text DEFAULT 'Aprobado',
  p_numero_factura text DEFAULT NULL,
  p_numero_oc text DEFAULT NULL,
  p_numero_entrada_almacen text DEFAULT NULL,
  p_cantidad_pendiente_oc numeric DEFAULT NULL,
  p_observaciones_calidad text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_ins public.insumos%ROWTYPE;
  v_mov public.movimientos_inventario%ROWTYPE;
  v_cadena jsonb;
  v_factor_calc numeric := 1;
  v_factor_usar numeric;
  v_cantidad_consumo numeric;
  v_costo_por_consumo numeric;
  v_nuevo_costo numeric;
  v_lote_final text;
  v_existencia_actual numeric;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_estado_calidad NOT IN ('Aprobado','Rechazado','Cuarentena') THEN
    RAISE EXCEPTION 'Estado de calidad inválido: %', p_estado_calidad;
  END IF;

  SELECT * INTO v_ins FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;
  v_existencia_actual := GREATEST(v_ins.existencia_actual, 0);

  v_cadena := COALESCE(v_ins.conversiones, '[]'::jsonb);
  IF jsonb_array_length(v_cadena) > 1 THEN
    SELECT COALESCE(EXP(SUM(LN(GREATEST((elem->>'factor')::numeric, 0.0000001)))), 1)
      INTO v_factor_calc
    FROM jsonb_array_elements(v_cadena) WITH ORDINALITY AS t(elem, ord)
    WHERE ord < jsonb_array_length(v_cadena);
  END IF;

  v_factor_usar := CASE WHEN p_rendimiento_real > 0 THEN p_rendimiento_real ELSE v_factor_calc END;
  v_cantidad_consumo := p_cantidad * v_factor_usar;
  v_lote_final := COALESCE(NULLIF(trim(p_lote_insumo), ''), 'SIN LOTE');

  IF p_costo_unitario IS NOT NULL AND p_costo_unitario > 0 THEN
    v_costo_por_consumo := p_costo_unitario / v_factor_usar;
    IF (v_existencia_actual + v_cantidad_consumo) > 0 THEN
      v_nuevo_costo := ((v_existencia_actual * v_ins.costo_unitario)
                        + (v_cantidad_consumo * v_costo_por_consumo))
                       / (v_existencia_actual + v_cantidad_consumo);
    ELSE
      v_nuevo_costo := v_costo_por_consumo;
    END IF;
  ELSE
    v_costo_por_consumo := v_ins.costo_unitario;
    v_nuevo_costo := v_ins.costo_unitario;
  END IF;

  -- Registro ÚNICO con todos los campos (sin PATCH posterior).
  INSERT INTO public.movimientos_inventario
    (insumo_id, tipo, cantidad, proveedor_id, motivo, rendimiento_real,
     unidad_compra, cantidad_compra, costo_unitario_momento, lote_insumo,
     estado_calidad, numero_factura, numero_oc, numero_entrada_almacen,
     cantidad_pendiente_oc, observaciones_calidad)
  VALUES
    (p_insumo_id, 'Entrada', v_cantidad_consumo, p_proveedor_id, p_motivo,
     p_rendimiento_real, (v_cadena->0->>'unidad'), p_cantidad,
     v_costo_por_consumo, v_lote_final, p_estado_calidad, p_numero_factura,
     p_numero_oc, p_numero_entrada_almacen, p_cantidad_pendiente_oc,
     p_observaciones_calidad)
  RETURNING * INTO v_mov;

  -- Solo Aprobado suma stock y lote (fix N8)
  IF p_estado_calidad = 'Aprobado' THEN
    UPDATE public.insumos
      SET existencia_actual = existencia_actual + v_cantidad_consumo,
          costo_unitario    = v_nuevo_costo
      WHERE id = p_insumo_id;
    -- El trigger mov_inv_sync_lotes hace el INSERT/UPDATE en insumo_lotes
  END IF;

  RETURN jsonb_build_object(
    'movimiento_id',    v_mov.id,
    'cantidad_consumo', v_cantidad_consumo,
    'existencia_nueva', CASE WHEN p_estado_calidad = 'Aprobado'
                             THEN v_existencia_actual + v_cantidad_consumo
                             ELSE v_existencia_actual END,
    'costo_unitario',   v_nuevo_costo,
    'estado_calidad',   p_estado_calidad
  );
END; $$;

-- Multi-lote: delega lote a lote propagando calidad + documentos.
DROP FUNCTION IF EXISTS public.registrar_entrada_multi_lote(uuid, jsonb, uuid, numeric);
DROP FUNCTION IF EXISTS public.registrar_entrada_multi_lote(uuid, jsonb, uuid, numeric, text);
CREATE OR REPLACE FUNCTION public.registrar_entrada_multi_lote(
  p_insumo_id uuid, p_lotes jsonb,
  p_proveedor_id uuid DEFAULT NULL,
  p_costo_unitario numeric DEFAULT NULL,
  p_estado_calidad text DEFAULT 'Aprobado',
  p_numero_factura text DEFAULT NULL,
  p_numero_oc text DEFAULT NULL,
  p_numero_entrada_almacen text DEFAULT NULL,
  p_cantidad_pendiente_oc numeric DEFAULT NULL,
  p_observaciones_calidad text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_item jsonb;
  v_count int := 0;
  v_total numeric := 0;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_result jsonb;
BEGIN
  PERFORM public.validar_escritura();
  IF p_lotes IS NULL OR jsonb_array_length(p_lotes) = 0 THEN
    RAISE EXCEPTION 'Debe enviar al menos un lote';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lotes) LOOP
    IF NULLIF(trim(v_item->>'lote'), '') IS NULL THEN
      RAISE EXCEPTION 'Todos los lotes deben tener número';
    END IF;
    IF (v_item->>'cantidad')::numeric <= 0 THEN
      RAISE EXCEPTION 'Cantidades deben ser > 0';
    END IF;
    v_result := public.registrar_entrada(
      p_insumo_id,
      (v_item->>'cantidad')::numeric,
      p_proveedor_id,
      p_costo_unitario,
      'Entrada multi-lote',
      NULL,
      trim(v_item->>'lote'),
      p_estado_calidad,
      p_numero_factura, p_numero_oc, p_numero_entrada_almacen,
      p_cantidad_pendiente_oc, p_observaciones_calidad
    );
    v_ids := v_ids || (v_result->>'movimiento_id')::uuid;
    v_total := v_total + (v_item->>'cantidad')::numeric;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'lotes_insertados', v_count,
    'cantidad_total',   v_total,
    'movimiento_ids',   to_jsonb(v_ids),
    'estado_calidad',   p_estado_calidad
  );
END; $$;

-- Ajuste positivo sin delegar a registrar_entrada (fix #7).
CREATE OR REPLACE FUNCTION public.ajustar_inventario(
  p_insumo_id uuid, p_nueva_existencia numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_insumo record; v_dif numeric;
BEGIN
  PERFORM public.validar_escritura();
  IF p_nueva_existencia IS NULL OR p_nueva_existencia < 0 THEN
    RAISE EXCEPTION 'Existencia no puede ser negativa';
  END IF;
  SELECT * INTO v_insumo FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;
  v_dif := p_nueva_existencia - v_insumo.existencia_actual;
  IF v_dif = 0 THEN RETURN jsonb_build_object('existencia_nueva', p_nueva_existencia); END IF;

  IF v_dif > 0 THEN
    -- Ajuste directo (v_dif ya está en unidades de consumo; NO multiplicar por factor)
    INSERT INTO public.insumo_lotes
      (insumo_id, lote, cantidad_recibida, cantidad_actual, costo_unitario, primer_ingreso, ultimo_ingreso)
    VALUES
      (p_insumo_id, 'AJUSTE', v_dif, v_dif, v_insumo.costo_unitario, now(), now())
    ON CONFLICT (insumo_id, lote) DO UPDATE
      SET cantidad_actual   = public.insumo_lotes.cantidad_actual   + EXCLUDED.cantidad_actual,
          cantidad_recibida = public.insumo_lotes.cantidad_recibida + EXCLUDED.cantidad_recibida,
          ultimo_ingreso    = EXCLUDED.ultimo_ingreso;

    INSERT INTO public.movimientos_inventario
      (insumo_id, tipo, cantidad, motivo, lote_insumo, costo_unitario_momento)
    VALUES
      (p_insumo_id, 'Entrada', v_dif, COALESCE(p_motivo, 'Ajuste positivo'),
       'AJUSTE', v_insumo.costo_unitario);

    UPDATE public.insumos SET existencia_actual = p_nueva_existencia WHERE id = p_insumo_id;
  ELSE
    PERFORM public.consumir_insumo_fifo(
      p_insumo_id, ABS(v_dif),
      COALESCE(p_motivo, 'Ajuste negativo'),
      NULL, 'Salida'
    );
  END IF;

  RETURN jsonb_build_object('existencia_nueva', p_nueva_existencia);
END; $$;

-- Salida manual en una sola llamada (fix #3 del audit anterior).
CREATE OR REPLACE FUNCTION public.registrar_salida(
  p_insumo_id uuid, p_cantidad numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_insumo record; v_existencia_nueva numeric;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad debe ser > 0'; END IF;
  SELECT * INTO v_insumo FROM public.insumos WHERE id = p_insumo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;

  PERFORM public.consumir_insumo_fifo(
    p_insumo_id, p_cantidad,
    'Salida manual: ' || COALESCE(p_motivo, 'Sin motivo'),
    NULL, 'Salida'
  );

  SELECT existencia_actual INTO v_existencia_nueva FROM public.insumos WHERE id = p_insumo_id;
  RETURN jsonb_build_object('existencia_nueva', v_existencia_nueva);
END; $$;

-- Devolución a proveedor: NULLIF + validación de lote (fix #5).
DROP FUNCTION IF EXISTS public.registrar_devolucion(uuid, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.registrar_devolucion(uuid, numeric, uuid, text, text);
CREATE OR REPLACE FUNCTION public.registrar_devolucion(
  p_insumo_id uuid, p_cantidad numeric, p_proveedor_id uuid,
  p_motivo text DEFAULT NULL, p_lote text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_insumo record;
  v_restante numeric := p_cantidad;
  v_tomar numeric;
  v_lote_rec record;
  v_existencia_nueva numeric;
  v_lote_limpio text := NULLIF(trim(p_lote), '');
BEGIN
    PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  SELECT * INTO v_insumo FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;
  IF v_insumo.existencia_actual < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficiente stock para devolver: disponible %, requerido %',
      v_insumo.existencia_actual, p_cantidad;
  END IF;

  IF v_lote_limpio IS NOT NULL THEN
    -- Validar que el lote exista y tenga saldo suficiente
    SELECT cantidad_actual INTO v_tomar
      FROM public.insumo_lotes
      WHERE insumo_id = p_insumo_id AND lote = v_lote_limpio FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El lote % no existe para este insumo', v_lote_limpio;
    END IF;
    IF v_tomar < p_cantidad THEN
      RAISE EXCEPTION 'El lote % solo tiene % disponibles; se intentan devolver %',
        v_lote_limpio, v_tomar, p_cantidad;
    END IF;
    UPDATE public.insumo_lotes
      SET cantidad_actual = cantidad_actual - p_cantidad
      WHERE insumo_id = p_insumo_id AND lote = v_lote_limpio;
  ELSE
    -- LIFO si no se especifica lote
    FOR v_lote_rec IN
      SELECT id, lote, cantidad_actual FROM public.insumo_lotes
      WHERE insumo_id = p_insumo_id AND cantidad_actual > 0
      ORDER BY primer_ingreso DESC, id DESC
    LOOP
      IF v_restante <= 0 THEN EXIT; END IF;
      v_tomar := LEAST(v_restante, v_lote_rec.cantidad_actual);
      UPDATE public.insumo_lotes SET cantidad_actual = cantidad_actual - v_tomar
        WHERE id = v_lote_rec.id;
      v_restante := v_restante - v_tomar;
    END LOOP;
    IF v_restante > 0 THEN
      RAISE EXCEPTION 'No hay saldo suficiente en lotes para devolver %', p_cantidad;
    END IF;
  END IF;

  UPDATE public.insumos SET existencia_actual = existencia_actual - p_cantidad
    WHERE id = p_insumo_id RETURNING existencia_actual INTO v_existencia_nueva;

  INSERT INTO public.movimientos_inventario
    (insumo_id, tipo, cantidad, proveedor_id, motivo, lote_insumo, costo_unitario_momento)
  VALUES
    (p_insumo_id, 'Salida', p_cantidad, p_proveedor_id,
     COALESCE(p_motivo, 'Devolución a proveedor'), v_lote_limpio, v_insumo.costo_unitario);

  RETURN jsonb_build_object('existencia_nueva', v_existencia_nueva);
END; $$;

-- Ajuste de costo manual con trazabilidad.
CREATE OR REPLACE FUNCTION public.ajustar_costo_insumo(
  p_insumo_id uuid, p_costo_nuevo numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_ins public.insumos%ROWTYPE; v_email text;
BEGIN
  PERFORM public.validar_escritura();
  IF p_costo_nuevo IS NULL OR p_costo_nuevo < 0 THEN RAISE EXCEPTION 'Costo no puede ser negativo'; END IF;
  SELECT * INTO v_ins FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;
  v_email := public.current_user_email();
  INSERT INTO public.ajustes_costo_insumo
    (insumo_id, costo_anterior, costo_nuevo, motivo, usuario_id, usuario_email)
  VALUES
    (p_insumo_id, v_ins.costo_unitario, p_costo_nuevo, p_motivo, auth.uid(), v_email);
  UPDATE public.insumos SET costo_unitario = p_costo_nuevo WHERE id = p_insumo_id;
  RETURN jsonb_build_object('costo_anterior', v_ins.costo_unitario, 'costo_nuevo', p_costo_nuevo);
END; $$;

-- =============================================================
-- SECCIÓN 6 · RPCs DE SUBPRODUCTOS
-- =============================================================

-- Guardar subproducto con detección de ciclos CONTRA p_hijos (fix #10).
DROP FUNCTION IF EXISTS public.guardar_subproducto(uuid, text, text, numeric, numeric, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION public.guardar_subproducto(
  p_id uuid, p_codigo text, p_nombre text,
  p_existencia numeric, p_punto_reorden numeric,
  p_receta jsonb, p_hijos jsonb DEFAULT '[]'::jsonb, p_tipo text DEFAULT 'ambos'
) RETURNS public.subproductos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_sub public.subproductos%ROWTYPE;
  v_row jsonb;
  v_hijo_ids uuid[] := ARRAY[]::uuid[];
  v_ciclo boolean;
BEGIN
  PERFORM public.validar_escritura();
  IF p_nombre IS NULL OR length(trim(p_nombre)) = 0 THEN RAISE EXCEPTION 'Nombre obligatorio'; END IF;
  IF p_tipo NOT IN ('intermedio','final','ambos') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;

  -- Recopilar IDs de hijos propuestos
  IF p_hijos IS NOT NULL THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_hijos) LOOP
      v_hijo_ids := v_hijo_ids || (v_row->>'subproducto_id')::uuid;
    END LOOP;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.subproductos (codigo, nombre, existencia_actual, punto_reorden, tipo)
    VALUES (p_codigo, p_nombre, COALESCE(p_existencia, 0), COALESCE(p_punto_reorden, 0), p_tipo)
    RETURNING * INTO v_sub;
  ELSE
    -- Detección de ciclos CONTRA los hijos NUEVOS (no contra aristas viejas).
    -- Buscamos si p_id es alcanzable desde alguno de los v_hijo_ids.
    IF array_length(v_hijo_ids, 1) > 0 THEN
      WITH RECURSIVE descendientes AS (
        SELECT unnest(v_hijo_ids) AS id
        UNION
        SELECT ss.subproducto_hijo_id FROM public.subproducto_subproductos ss
          JOIN descendientes d ON ss.subproducto_padre_id = d.id
      )
      SELECT EXISTS (SELECT 1 FROM descendientes WHERE id = p_id) INTO v_ciclo;
      IF v_ciclo THEN
        RAISE EXCEPTION 'Ciclo detectado: el subproducto se contiene a sí mismo transitivamente';
      END IF;
    END IF;
    -- Autoreferencia directa
    IF p_id = ANY(v_hijo_ids) THEN
      RAISE EXCEPTION 'Auto-referencia: un subproducto no puede ser hijo de sí mismo';
    END IF;

    UPDATE public.subproductos
      SET nombre = p_nombre,
          punto_reorden = COALESCE(p_punto_reorden, 0),
          tipo = p_tipo
      WHERE id = p_id RETURNING * INTO v_sub;
    IF NOT FOUND THEN RAISE EXCEPTION 'Subproducto no encontrado'; END IF;
    DELETE FROM public.subproducto_recetas WHERE subproducto_id = p_id;
    DELETE FROM public.subproducto_subproductos WHERE subproducto_padre_id = p_id;
  END IF;

  IF p_receta IS NOT NULL THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_receta) LOOP
      INSERT INTO public.subproducto_recetas
        (subproducto_id, insumo_id, cantidad_por_unidad, unidad_receta, factor_receta)
      VALUES
        (v_sub.id, (v_row->>'insumo_id')::uuid, (v_row->>'cantidad')::numeric,
         NULLIF(v_row->>'unidad_receta',''), COALESCE((v_row->>'factor_receta')::numeric, 1));
    END LOOP;
  END IF;

  IF p_hijos IS NOT NULL THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_hijos) LOOP
      INSERT INTO public.subproducto_subproductos
        (subproducto_padre_id, subproducto_hijo_id, cantidad_por_unidad)
      VALUES
        (v_sub.id, (v_row->>'subproducto_id')::uuid, (v_row->>'cantidad')::numeric);
    END LOOP;
  END IF;

  RETURN v_sub;
END; $$;

-- Producir subproducto (llamado desde UI de Entrada de mercancía).
CREATE OR REPLACE FUNCTION public.producir_subproducto(
  p_id uuid, p_cantidad numeric, p_lote text DEFAULT NULL, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_sub record; v_receta record; v_hijo record;
  v_items int := 0; v_existencia_nueva numeric;
  v_stock numeric; v_faltantes jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  SELECT * INTO v_sub FROM public.subproductos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subproducto no encontrado'; END IF;

  -- Validar stock de insumos
  FOR v_receta IN SELECT insumo_id, cantidad_por_unidad, factor_receta
                  FROM public.subproducto_recetas WHERE subproducto_id = p_id LOOP
    SELECT existencia_actual INTO v_stock FROM public.insumos
      WHERE id = v_receta.insumo_id FOR UPDATE;
    IF v_stock < v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta,1) * p_cantidad THEN
      v_faltantes := v_faltantes || jsonb_build_object(
        'tipo','insumo','insumo_id',v_receta.insumo_id
      );
    END IF;
  END LOOP;

  -- Validar stock de hijos
  FOR v_hijo IN SELECT subproducto_hijo_id, cantidad_por_unidad
                FROM public.subproducto_subproductos WHERE subproducto_padre_id = p_id LOOP
    SELECT existencia_actual INTO v_stock FROM public.subproductos
      WHERE id = v_hijo.subproducto_hijo_id FOR UPDATE;
    IF v_stock < v_hijo.cantidad_por_unidad * p_cantidad THEN
      v_faltantes := v_faltantes || jsonb_build_object(
        'tipo','subproducto','subproducto_id',v_hijo.subproducto_hijo_id
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_faltantes) > 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: %', v_faltantes::text;
  END IF;

  -- Consumir insumos con FIFO
  FOR v_receta IN SELECT insumo_id, cantidad_por_unidad, factor_receta
                  FROM public.subproducto_recetas WHERE subproducto_id = p_id LOOP
    PERFORM public.consumir_insumo_fifo(
      v_receta.insumo_id,
      v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta,1) * p_cantidad,
      'Producción de ' || v_sub.nombre,
      NULL, 'Consumo'
    );
    v_items := v_items + 1;
  END LOOP;

  -- Consumir hijos
  FOR v_hijo IN SELECT subproducto_hijo_id, cantidad_por_unidad
                FROM public.subproducto_subproductos WHERE subproducto_padre_id = p_id LOOP
    UPDATE public.subproductos
      SET existencia_actual = existencia_actual - (v_hijo.cantidad_por_unidad * p_cantidad)
      WHERE id = v_hijo.subproducto_hijo_id;
    INSERT INTO public.movimientos_inventario
      (subproducto_id, tipo, cantidad, motivo)
    VALUES
      (v_hijo.subproducto_hijo_id, 'Consumo',
       v_hijo.cantidad_por_unidad * p_cantidad,
       'Producción de ' || v_sub.nombre);
    v_items := v_items + 1;
  END LOOP;

  UPDATE public.subproductos SET existencia_actual = existencia_actual + p_cantidad
    WHERE id = p_id RETURNING existencia_actual INTO v_existencia_nueva;
  INSERT INTO public.movimientos_inventario
    (subproducto_id, tipo, cantidad, motivo, lote_insumo)
  VALUES
    (p_id, 'Entrada', p_cantidad, COALESCE(p_motivo, 'Producción manual'), p_lote);
  RETURN jsonb_build_object('existencia_nueva', v_existencia_nueva, 'items_afectados', v_items);
END; $$;

CREATE OR REPLACE FUNCTION public.ajustar_subproducto(
  p_id uuid, p_nueva_existencia numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_sub public.subproductos%ROWTYPE; v_diff numeric; v_tipo text;
BEGIN
  PERFORM public.validar_escritura();
  IF p_nueva_existencia IS NULL OR p_nueva_existencia < 0 THEN
    RAISE EXCEPTION 'Existencia no puede ser negativa';
  END IF;
  SELECT * INTO v_sub FROM public.subproductos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subproducto no encontrado'; END IF;
  v_diff := p_nueva_existencia - v_sub.existencia_actual;
  IF v_diff = 0 THEN RETURN jsonb_build_object('existencia_nueva', p_nueva_existencia); END IF;
  v_tipo := CASE WHEN v_diff > 0 THEN 'Entrada' ELSE 'Salida' END;
  UPDATE public.subproductos SET existencia_actual = p_nueva_existencia WHERE id = p_id;
  INSERT INTO public.movimientos_inventario (subproducto_id, tipo, cantidad, motivo)
  VALUES (p_id, v_tipo, ABS(v_diff), COALESCE(p_motivo,'Ajuste por inventario físico'));
  RETURN jsonb_build_object('existencia_nueva', p_nueva_existencia);
END; $$;

-- =============================================================
-- SECCIÓN 7 · RPCs DE PAQUETES / PT
-- =============================================================

CREATE OR REPLACE FUNCTION public.guardar_paquete(
  p_codigo_pt text, p_es_nuevo boolean, p_nombre text,
  p_subproductos jsonb, p_insumos jsonb,
  p_unidades_por_caja integer DEFAULT 1,
  p_precio_venta numeric DEFAULT NULL
) RETURNS public.productos_terminados
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_prod public.productos_terminados%ROWTYPE; v_row jsonb;
BEGIN
  PERFORM public.validar_escritura();
  IF p_nombre IS NULL OR length(trim(p_nombre)) = 0 THEN RAISE EXCEPTION 'Nombre obligatorio'; END IF;
  IF p_unidades_por_caja IS NULL OR p_unidades_por_caja < 1 THEN RAISE EXCEPTION 'Unidades por caja >= 1'; END IF;

  IF p_es_nuevo THEN
    INSERT INTO public.productos_terminados (codigo_pt, nombre, unidades_por_caja, precio_venta)
    VALUES (p_codigo_pt, p_nombre, p_unidades_por_caja, p_precio_venta)
    RETURNING * INTO v_prod;
  ELSE
    UPDATE public.productos_terminados
      SET nombre = p_nombre, unidades_por_caja = p_unidades_por_caja,
          precio_venta = p_precio_venta
      WHERE codigo_pt = p_codigo_pt RETURNING * INTO v_prod;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
    DELETE FROM public.paquete_subproductos WHERE codigo_pt = p_codigo_pt;
    DELETE FROM public.bom_recetas WHERE codigo_pt = p_codigo_pt;
  END IF;

  IF p_subproductos IS NOT NULL THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_subproductos) LOOP
      INSERT INTO public.paquete_subproductos (codigo_pt, subproducto_id, cantidad)
      VALUES (v_prod.codigo_pt, (v_row->>'subproducto_id')::uuid, (v_row->>'cantidad')::numeric);
    END LOOP;
  END IF;

  IF p_insumos IS NOT NULL THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_insumos) LOOP
      INSERT INTO public.bom_recetas (codigo_pt, insumo_id, cantidad_por_unidad)
      VALUES (v_prod.codigo_pt, (v_row->>'insumo_id')::uuid, (v_row->>'cantidad')::numeric);
    END LOOP;
  END IF;

  RETURN v_prod;
END; $$;

CREATE OR REPLACE FUNCTION public.eliminar_insumo(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_bom int; v_subre int; v_mov int;
BEGIN
  PERFORM public.validar_escritura();
  SELECT COUNT(*) INTO v_bom FROM public.bom_recetas WHERE insumo_id = p_id;
  SELECT COUNT(*) INTO v_subre FROM public.subproducto_recetas WHERE insumo_id = p_id;
  SELECT COUNT(*) INTO v_mov FROM public.movimientos_inventario WHERE insumo_id = p_id;
  IF v_bom > 0 OR v_subre > 0 THEN
    RAISE EXCEPTION 'En uso en recetas (BOM: %, subproductos: %)', v_bom, v_subre;
  END IF;
  IF v_mov > 0 THEN
    RAISE EXCEPTION 'Tiene % movimientos. Desactívalo en lugar de borrarlo.', v_mov;
  END IF;
  DELETE FROM public.insumos WHERE id = p_id;
END; $$;

-- =============================================================
-- SECCIÓN 8 · RPCs DE ÓRDENES
-- =============================================================

CREATE OR REPLACE FUNCTION public.confirmar_orden(
  p_codigo_pt text, p_cantidad numeric, p_estado_cobertura text, p_detalle jsonb,
  p_numero_op text DEFAULT NULL, p_cantidad_cajas numeric DEFAULT NULL,
  p_lote text DEFAULT NULL, p_prioridad integer DEFAULT NULL,
  p_fecha_programada date DEFAULT NULL, p_fecha_fin_programada date DEFAULT NULL
) RETURNS public.ordenes_semanales
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_orden public.ordenes_semanales%ROWTYPE;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  INSERT INTO public.ordenes_semanales
    (codigo_pt, cantidad_proyectada, estado_cobertura, detalle_faltantes,
     numero_op, cantidad_cajas, lote, prioridad, fecha_programada, fecha_fin_programada)
  VALUES
    (p_codigo_pt, p_cantidad, p_estado_cobertura, p_detalle,
     p_numero_op, p_cantidad_cajas, p_lote, p_prioridad,
     p_fecha_programada, p_fecha_fin_programada)
  RETURNING * INTO v_orden;
  RETURN v_orden;
END; $$;

CREATE OR REPLACE FUNCTION public.cancelar_orden(p_orden_id uuid, p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_orden public.ordenes_semanales%ROWTYPE;
BEGIN
  PERFORM public.validar_escritura();
  SELECT * INTO v_orden FROM public.ordenes_semanales WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;
  IF v_orden.estado_op = 'Terminada' THEN RAISE EXCEPTION 'No se puede cancelar una OP terminada'; END IF;
  IF v_orden.estado_op = 'Cancelada' THEN RAISE EXCEPTION 'La OP ya está cancelada'; END IF;
  UPDATE public.ordenes_semanales
    SET estado_op = 'Cancelada', fecha_cancelado = now(), motivo_cancelacion = p_motivo
    WHERE id = p_orden_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Vista de cobertura en vivo (para abrirModalDetalleOrden — sin PATCH al ver).
DROP FUNCTION IF EXISTS public.recalcular_cobertura_op(uuid);
CREATE OR REPLACE FUNCTION public.recalcular_cobertura_op(p_orden_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_op record;
  v_simulacion jsonb;
  v_faltantes jsonb := '[]'::jsonb;
  v_peor text := 'Cubierto';
  v_ins_key text;
  v_ins record;
  v_requerido numeric;
  v_stock numeric;
  v_pendiente numeric;
BEGIN
  SELECT * INTO v_op FROM public.ordenes_semanales WHERE id = p_orden_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OP no encontrada'; END IF;

  v_pendiente := v_op.cantidad_proyectada - COALESCE(v_op.cantidad_producida, 0);
  IF v_pendiente <= 0 THEN
    RETURN jsonb_build_object('estado_general','Terminada','faltantes','[]'::jsonb);
  END IF;

  v_simulacion := public.simular_consumo_pt(v_op.codigo_pt, v_pendiente);

  FOR v_ins_key IN SELECT jsonb_object_keys(v_simulacion->'insumo_req') LOOP
    v_requerido := (v_simulacion->'insumo_req'->>v_ins_key)::numeric;
    SELECT existencia_actual, nombre, codigo FROM public.insumos WHERE id = v_ins_key::uuid INTO v_ins;
    IF FOUND AND v_ins.existencia_actual < v_requerido THEN
      v_faltantes := v_faltantes || jsonb_build_object(
        'tipo','insumo','insumo_id',v_ins_key,
        'nombre',v_ins.nombre,'codigo',v_ins.codigo,
        'requerido',v_requerido,'existencia',v_ins.existencia_actual
      );
      v_peor := 'Urgente';
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'estado_general', v_peor,
    'faltantes', v_faltantes,
    'pendiente', v_pendiente
  );
END; $$;

-- Registrar entrega OP: valida + lockea + consume con recursión.
CREATE OR REPLACE FUNCTION public.registrar_entrega_op(
  p_orden_id uuid, p_cantidad numeric,
  p_lote_entrega text DEFAULT NULL, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_op record;
  v_ins record;
  v_sub record;
  v_simulacion jsonb;
  v_insumo_req jsonb;
  v_key text;
  v_cant_req numeric;
  v_stock numeric;
  v_faltantes jsonb := '[]'::jsonb;
  v_email text;
  v_producido_antes numeric;
  v_existencia_pt numeric;
  v_pendiente numeric;
  v_items_afectados int := 0;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad debe ser > 0'; END IF;

  SELECT * INTO v_op FROM public.ordenes_semanales WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OP no encontrada'; END IF;
  IF v_op.estado_op IN ('Terminada','Cancelada') THEN
    RAISE EXCEPTION 'La OP ya está cerrada o cancelada';
  END IF;

  v_producido_antes := COALESCE(v_op.cantidad_producida, 0);
  v_pendiente := v_op.cantidad_proyectada - v_producido_antes;
  IF p_cantidad > v_pendiente THEN
    RAISE EXCEPTION 'La cantidad excede el pendiente. Pendiente: %', v_pendiente;
  END IF;

  -- Simulación con acumulación (fix #12): consolida subproductos repetidos
  v_simulacion := public.simular_consumo_pt(v_op.codigo_pt, p_cantidad);
  v_insumo_req := v_simulacion->'insumo_req';

  -- Lock + validación previa de TODOS los insumos involucrados
  FOR v_key IN SELECT jsonb_object_keys(v_insumo_req) LOOP
    v_cant_req := (v_insumo_req->>v_key)::numeric;
    SELECT existencia_actual, nombre INTO v_stock, v_ins.nombre
      FROM public.insumos WHERE id = v_key::uuid FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insumo % no encontrado', v_key;
    END IF;
    IF v_stock < v_cant_req THEN
      v_faltantes := v_faltantes || jsonb_build_object(
        'tipo','insumo','insumo_id',v_key,
        'nombre',v_ins.nombre,'requerido',v_cant_req,'existencia',v_stock
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_faltantes) > 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para esta entrega: %', v_faltantes::text;
  END IF;

  -- FASE 2: consumir subproductos (recursivo con auto-producción)
  FOR v_sub IN SELECT subproducto_id, cantidad FROM public.paquete_subproductos
               WHERE codigo_pt = v_op.codigo_pt LOOP
    PERFORM public.consumir_subproducto_recursivo(
      v_sub.subproducto_id, v_sub.cantidad * p_cantidad, p_orden_id
    );
    v_items_afectados := v_items_afectados + 1;
  END LOOP;

  -- FASE 3: consumir insumos directos
  FOR v_ins IN SELECT insumo_id, cantidad_por_unidad FROM public.bom_recetas
               WHERE codigo_pt = v_op.codigo_pt LOOP
    PERFORM public.consumir_insumo_fifo(
      v_ins.insumo_id, v_ins.cantidad_por_unidad * p_cantidad,
      'Consumo OP ' || COALESCE(v_op.numero_op,''),
      p_orden_id, 'Consumo'
    );
    v_items_afectados := v_items_afectados + 1;
  END LOOP;

  -- FASE 4: entrega + PT + OP
  v_email := public.current_user_email();
  INSERT INTO public.entregas_op (orden_id, cantidad, lote_entrega, motivo, usuario_email)
  VALUES (p_orden_id, p_cantidad, NULLIF(trim(p_lote_entrega),''), p_motivo, v_email);

  UPDATE public.productos_terminados
    SET existencia_actual = COALESCE(existencia_actual, 0) + p_cantidad
    WHERE codigo_pt = v_op.codigo_pt
    RETURNING existencia_actual INTO v_existencia_pt;

  UPDATE public.ordenes_semanales
    SET cantidad_producida = v_producido_antes + p_cantidad,
        estado_op = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada
                         THEN 'Terminada' ELSE 'En proceso' END,
        fecha_completado = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada
                                THEN now() ELSE NULL END,
        fecha_ultima_entrega = now()
  WHERE id = p_orden_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cantidad_producida', v_producido_antes + p_cantidad,
    'cantidad_pendiente', v_pendiente - p_cantidad,
    'op_cerrada', (v_producido_antes + p_cantidad) >= v_op.cantidad_proyectada,
    'existencia_pt', v_existencia_pt,
    'items_afectados', v_items_afectados
  );
END; $$;

-- =============================================================
-- SECCIÓN 9 · RPCs DE PT, DEVOLUCIONES Y DESPACHOS
-- =============================================================

CREATE OR REPLACE FUNCTION public.registrar_devolucion_pt(
  p_codigo_pt text, p_cantidad numeric,
  p_estado_producto text DEFAULT 'bueno', p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_pt public.productos_terminados%ROWTYPE; v_id uuid; v_email text; v_existencia_despues numeric;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_estado_producto NOT IN ('bueno','dañado','cuarentena') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;
  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = p_codigo_pt FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT no encontrado'; END IF;
  IF p_estado_producto = 'bueno' THEN
    UPDATE public.productos_terminados
      SET existencia_actual = COALESCE(existencia_actual, 0) + p_cantidad
      WHERE codigo_pt = p_codigo_pt;
    v_existencia_despues := COALESCE(v_pt.existencia_actual, 0) + p_cantidad;
  ELSE
    v_existencia_despues := COALESCE(v_pt.existencia_actual, 0);
  END IF;
  v_email := public.current_user_email();
  INSERT INTO public.devoluciones_pt
    (codigo_pt, cantidad, estado_producto, motivo, usuario_id, usuario_email)
  VALUES
    (p_codigo_pt, p_cantidad, p_estado_producto, p_motivo, auth.uid(), v_email)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'existencia_nueva', v_existencia_despues,
                            'afecta_stock', p_estado_producto = 'bueno');
END; $$;

CREATE OR REPLACE FUNCTION public.registrar_despacho(
  p_codigo_pt text, p_cantidad numeric, p_cliente text,
  p_lote_op text DEFAULT NULL, p_consecutivo text DEFAULT NULL,
  p_oc text DEFAULT NULL, p_fecha date DEFAULT CURRENT_DATE,
  p_fecha_vencimiento text DEFAULT NULL, p_observaciones text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_pt record; v_existencia_nueva numeric; v_email text;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_cliente IS NULL OR length(trim(p_cliente)) = 0 THEN RAISE EXCEPTION 'Cliente obligatorio'; END IF;
  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = p_codigo_pt FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT no encontrado'; END IF;
  IF v_pt.existencia_actual < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_pt.existencia_actual;
  END IF;
  UPDATE public.productos_terminados SET existencia_actual = existencia_actual - p_cantidad
    WHERE codigo_pt = p_codigo_pt RETURNING existencia_actual INTO v_existencia_nueva;
  v_email := public.current_user_email();
  INSERT INTO public.despachos
    (codigo_pt, cantidad, cliente, lote_op, consecutivo, oc, fecha,
     fecha_vencimiento, observaciones, usuario_email)
  VALUES
    (p_codigo_pt, p_cantidad, p_cliente, p_lote_op, p_consecutivo, p_oc, p_fecha,
     p_fecha_vencimiento, p_observaciones, v_email);
  RETURN jsonb_build_object('ok', true, 'existencia_nueva', v_existencia_nueva);
END; $$;

-- =============================================================
-- SECCIÓN 10 · RPCs DE CAJAS
-- =============================================================

CREATE OR REPLACE FUNCTION public.siguiente_codigo_caja(p_codigo_pt text, p_lote text)
RETURNS int LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE v_max int := 0; v_rec record; v_match text[];
BEGIN
  FOR v_rec IN
    SELECT codigo_caja FROM public.cajas_ubicacion
    WHERE codigo_pt = p_codigo_pt AND codigo_caja LIKE '%' || '-LOTE-' || p_lote
  LOOP
    v_match := regexp_match(v_rec.codigo_caja, '-C(\d+)-LOTE-');
    IF v_match IS NOT NULL THEN v_max := GREATEST(v_max, v_match[1]::int); END IF;
  END LOOP;
  RETURN v_max + 1;
END; $$;

CREATE OR REPLACE FUNCTION public.reservar_cajas_lote(
  p_codigo_pt text, p_lote text, p_cantidad int
) RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_inicio int; v_codigos text[] := ARRAY[]::text[];
  v_i int; v_cod text; v_email text;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad debe ser > 0'; END IF;
  IF p_lote IS NULL OR length(trim(p_lote)) = 0 THEN
    RAISE EXCEPTION 'El lote es obligatorio para generar códigos de caja';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_codigo_pt || ':' || p_lote));
  v_inicio := public.siguiente_codigo_caja(p_codigo_pt, p_lote);
  v_email := public.current_user_email();

  FOR v_i IN 0..(p_cantidad - 1) LOOP
    v_cod := p_codigo_pt || '-C' || lpad((v_inicio + v_i)::text, 3, '0')
             || '-LOTE-' || p_lote;
    v_codigos := array_append(v_codigos, v_cod);
    INSERT INTO public.cajas_ubicacion
      (codigo_caja, codigo_pt, ubicacion, estado, usuario_email, actualizado_en)
    VALUES
      (v_cod, p_codigo_pt, 'Pendiente de ubicar', 'Impresa', v_email, now())
    ON CONFLICT (codigo_caja) DO NOTHING;
  END LOOP;

  RETURN v_codigos;
END; $$;

-- =============================================================
-- SECCIÓN 11 · TRIGGERS
-- =============================================================

-- Crear profile al crear usuario en auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nombre, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    'consulta'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar insumo_lotes al insertar movimiento Entrada (Aprobado).
CREATE OR REPLACE FUNCTION public.mov_inv_sync_lotes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_lote text;
BEGIN
  IF NEW.tipo = 'Entrada'
     AND NEW.insumo_id IS NOT NULL
     AND COALESCE(NEW.estado_calidad, 'Aprobado') = 'Aprobado'
  THEN
    v_lote := COALESCE(NULLIF(trim(NEW.lote_insumo), ''), 'SIN LOTE');
    INSERT INTO public.insumo_lotes
      (insumo_id, lote, cantidad_recibida, cantidad_actual, costo_unitario,
       proveedor_id, primer_ingreso, ultimo_ingreso)
    VALUES
      (NEW.insumo_id, v_lote, COALESCE(NEW.cantidad,0), COALESCE(NEW.cantidad,0),
       NEW.costo_unitario_momento, NEW.proveedor_id, NEW.fecha, NEW.fecha)
    ON CONFLICT (insumo_id, lote) DO UPDATE
      SET cantidad_recibida = public.insumo_lotes.cantidad_recibida + EXCLUDED.cantidad_recibida,
          cantidad_actual   = public.insumo_lotes.cantidad_actual   + EXCLUDED.cantidad_actual,
          ultimo_ingreso    = EXCLUDED.ultimo_ingreso,
          costo_unitario    = COALESCE(EXCLUDED.costo_unitario, public.insumo_lotes.costo_unitario),
          proveedor_id      = COALESCE(EXCLUDED.proveedor_id, public.insumo_lotes.proveedor_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS mov_inv_sync_lotes_trg ON public.movimientos_inventario;
CREATE TRIGGER mov_inv_sync_lotes_trg
  AFTER INSERT ON public.movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.mov_inv_sync_lotes();

-- Bloquear cambios a estado_calidad (fix #4 / A5).
-- Cualquier corrección debe pasar por una función dedicada (a futuro).
CREATE OR REPLACE FUNCTION public.mov_inv_bloquear_cambio_calidad()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado_calidad IS DISTINCT FROM NEW.estado_calidad THEN
    RAISE EXCEPTION 'El estado de calidad de un movimiento es inmutable. '
                    'Para rectificar, usar el procedimiento de liberación (pendiente).';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS mov_inv_bloquear_cambio_calidad_trg ON public.movimientos_inventario;
CREATE TRIGGER mov_inv_bloquear_cambio_calidad_trg
  BEFORE UPDATE ON public.movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.mov_inv_bloquear_cambio_calidad();

-- sys_config: metadata en updates.
CREATE OR REPLACE FUNCTION public.sys_config_actualizar_meta()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.actualizado_en := now();
  NEW.actualizado_por := auth.uid();
  SELECT email INTO NEW.actualizado_por_email FROM public.profiles WHERE user_id = auth.uid();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sys_config_meta ON public.sys_config;
CREATE TRIGGER sys_config_meta
  BEFORE UPDATE ON public.sys_config
  FOR EACH ROW EXECUTE FUNCTION public.sys_config_actualizar_meta();

-- =============================================================
-- SECCIÓN 12 · RLS (fix #2: escritura solo en catálogo)
-- =============================================================

-- Habilitar RLS en TODAS las tablas.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'insumos','subproductos','productos_terminados','bom_recetas',
    'subproducto_recetas','subproducto_subproductos','paquete_subproductos',
    'ordenes_semanales','movimientos_inventario','sys_proveedores',
    'entregas_op','ajustes_costo_insumo','backup_log',
    'etiquetas_impresas','devoluciones_pt','evaluaciones_proveedores',
    'insumo_lotes','despachos','cajas_ubicacion','sys_config'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS rol_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS rol_write ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%I', t);
  END LOOP;
END $$;

-- SELECT permitido para todos los roles válidos (no inactivos)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'insumos','subproductos','productos_terminados','bom_recetas',
    'subproducto_recetas','subproducto_subproductos','paquete_subproductos',
    'ordenes_semanales','movimientos_inventario','sys_proveedores',
    'entregas_op','ajustes_costo_insumo','backup_log',
    'etiquetas_impresas','devoluciones_pt','evaluaciones_proveedores',
    'insumo_lotes','despachos','cajas_ubicacion','sys_config'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY rol_select ON public.%I FOR SELECT TO authenticated '
      'USING (public.current_user_role() IN (''admin'',''operador'',''consulta''))', t);
  END LOOP;
END $$;

-- ESCRITURA SOLO EN TABLAS DE CATÁLOGO (fix #2)
-- Movimientos, entregas, ajustes, devoluciones, despachos, lotes y cajas
-- son SOLO escritura vía RPC (SECURITY DEFINER). Revocamos INSERT/UPDATE/DELETE.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'insumos','subproductos','productos_terminados','bom_recetas',
    'subproducto_recetas','subproducto_subproductos','paquete_subproductos',
    'sys_proveedores'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY rol_write ON public.%I FOR ALL TO authenticated '
      'USING (public.current_user_role() IN (''admin'',''operador'')) '
      'WITH CHECK (public.current_user_role() IN (''admin'',''operador''))', t);
  END LOOP;
END $$;

-- profiles: escritura solo admin; lectura de sí mismo + admin.
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_write ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin','operador','consulta')
    AND (user_id = auth.uid() OR public.current_user_role() = 'admin')
  );
CREATE POLICY profiles_write ON public.profiles FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- backup_log: insert solo admin/operador, select todos válidos.
DROP POLICY IF EXISTS backup_log_insert ON public.backup_log;
CREATE POLICY backup_log_insert ON public.backup_log FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

-- =============================================================
-- SECCIÓN 13 · REVOKE MASIVO (AL FINAL, con firmas ya existentes)
-- =============================================================

-- Revocar EXECUTE de PUBLIC y anon sobre TODO.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- Funciones internas: solo invocables desde otros RPCs (SECURITY DEFINER).
-- Los usuarios autenticados NO pueden llamarlas directo.
REVOKE EXECUTE ON FUNCTION public.consumir_insumo_fifo(uuid, numeric, text, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.consumir_subproducto_recursivo(uuid, numeric, uuid, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.simular_consumo_subproducto(uuid, numeric, jsonb, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.subproducto_costo(uuid, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.paquete_costo(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mov_inv_sync_lotes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mov_inv_bloquear_cambio_calidad() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sys_config_actualizar_meta() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Funciones públicas para el front (nombres explícitos).
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_escritura() TO authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.costos_todos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_caja(text, text) TO authenticated;

-- =============================================================
-- SECCIÓN 14 · BACKFILL + HEALTH CHECK
-- =============================================================

-- Crear profiles para usuarios existentes sin fila.
INSERT INTO public.profiles (user_id, email, nombre, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'nombre', email), 'consulta'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Verificación post-instalación (llamar manualmente después de correr el script).
CREATE OR REPLACE FUNCTION public.system_health_check()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_funcs_sin_search_path jsonb;
  v_funcs_anon jsonb;
  v_tablas_sin_rls jsonb;
BEGIN
  -- Funciones sin SET search_path que son SECURITY DEFINER
  SELECT COALESCE(jsonb_agg(p.proname), '[]'::jsonb) INTO v_funcs_sin_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
    ));

  -- Funciones ejecutables por anon
  SELECT COALESCE(jsonb_agg(p.proname), '[]'::jsonb) INTO v_funcs_anon
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  -- Tablas sin RLS habilitado
  SELECT COALESCE(jsonb_agg(c.relname), '[]'::jsonb) INTO v_tablas_sin_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  RETURN jsonb_build_object(
    'ok', (jsonb_array_length(v_funcs_sin_search_path) = 0
           AND jsonb_array_length(v_funcs_anon) = 0
           AND jsonb_array_length(v_tablas_sin_rls) = 0),
    'security_definer_sin_search_path', v_funcs_sin_search_path,
    'funciones_expuestas_a_anon', v_funcs_anon,
    'tablas_sin_rls', v_tablas_sin_rls,
    'timestamp', now()
  );
END; $$;

-- =============================================================
-- POST-SETUP
-- =============================================================
--   1. Authentication → Users → Add user (marcar "Auto Confirm User").
--   2. Promover a admin:
--      UPDATE public.profiles SET role = 'admin' WHERE email = 'correo@ejemplo.com';
--   3. Verificar con: SELECT public.system_health_check();
-- =============================================================
-- FIN DEL SCHEMA v2.5.2
-- =============================================================