-- =============================================================
-- AseptiQ — Schema v1.0.0
-- Reconstrucción SDD (Spec-Driven Development)
--
-- Requiere: PostgreSQL 15+ (Supabase)
-- Ejecutar COMPLETO en el SQL Editor de Supabase (dev).
--
-- Orden de ejecución interno:
--   · Parte 1: extensiones, tablas, índices, helpers
--   · Parte 2: RPCs de negocio
--   · Parte 3: triggers, RLS, revokes, health check
--
-- NO ejecutar por partes. El archivo es atómico (transacción implícita
-- del SQL Editor).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- SECCIÓN 1 · TABLAS
-- =============================================================

-- 1.1 CATEGORÍAS
CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_tipo text NOT NULL CHECK (item_tipo IN ('insumo','subproducto','producto_terminado')),
  nombre text NOT NULL,
  descripcion text,
  orden int NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_tipo, nombre)
);

-- 1.2 INSUMOS
CREATE TABLE public.insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  unidad_medida text NOT NULL,
  unidad_consumo text,
  conversiones jsonb NOT NULL DEFAULT '[]'::jsonb,
  tipo_conversion text NOT NULL DEFAULT 'fijo'
    CHECK (tipo_conversion IN ('fijo','dimensional','variable')),
  costo_unitario numeric NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  punto_reorden numeric NOT NULL CHECK (punto_reorden > 0),
  existencia_actual numeric NOT NULL DEFAULT 0 CHECK (existencia_actual >= 0),
  requiere_lote boolean NOT NULL DEFAULT true,
  requiere_vencimiento boolean NOT NULL DEFAULT false,
  estado_activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insumos_vencimiento_requiere_lote CHECK (NOT requiere_vencimiento OR requiere_lote)
);

-- 1.3 SUBPRODUCTOS
CREATE TABLE public.subproductos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'ambos'
    CHECK (tipo IN ('intermedio','final','ambos')),
  existencia_actual numeric NOT NULL DEFAULT 0 CHECK (existencia_actual >= 0),
  estado_activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.4 PRODUCTOS TERMINADOS
CREATE TABLE public.productos_terminados (
  codigo_pt text PRIMARY KEY,
  nombre text NOT NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  unidades_por_caja integer NOT NULL DEFAULT 1 CHECK (unidades_por_caja >= 1),
  existencia_actual numeric NOT NULL DEFAULT 0 CHECK (existencia_actual >= 0),
  precio_venta numeric CHECK (precio_venta IS NULL OR precio_venta >= 0),
  plantilla_etiqueta text NOT NULL DEFAULT 'esteril_proclides'
    CHECK (plantilla_etiqueta IN (
      'esteril_proclides','esteril_allmed','noesteril_allmed',
      'noesteril_proclides_grande','noesteril_proclides_mediana'
    )),
  vida_util_meses integer NOT NULL DEFAULT 35 CHECK (vida_util_meses > 0),
  registro_invima text,
  codigo_barras text,
  requiere_esterilizacion boolean NOT NULL DEFAULT false,
  estado_activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.5 PROVEEDORES
CREATE TABLE public.sys_proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nit text NOT NULL UNIQUE,
  razon_social text NOT NULL,
  direccion text,
  contactos jsonb NOT NULL DEFAULT '[]'::jsonb,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.6 RECETAS
CREATE TABLE public.bom_recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id),
  cantidad_por_unidad numeric NOT NULL CHECK (cantidad_por_unidad > 0),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subproducto_recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subproducto_id uuid NOT NULL REFERENCES public.subproductos(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id),
  cantidad_por_unidad numeric NOT NULL CHECK (cantidad_por_unidad > 0),
  unidad_receta text,
  factor_receta numeric NOT NULL DEFAULT 1 CHECK (factor_receta > 0),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subproducto_subproductos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subproducto_padre_id uuid NOT NULL REFERENCES public.subproductos(id) ON DELETE CASCADE,
  subproducto_hijo_id uuid NOT NULL REFERENCES public.subproductos(id),
  cantidad_por_unidad numeric NOT NULL CHECK (cantidad_por_unidad > 0),
  creado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (subproducto_padre_id <> subproducto_hijo_id)
);

CREATE TABLE public.paquete_subproductos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt) ON DELETE CASCADE,
  subproducto_id uuid NOT NULL REFERENCES public.subproductos(id),
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.7 ÓRDENES
CREATE TABLE public.ordenes_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  cantidad_proyectada numeric NOT NULL CHECK (cantidad_proyectada > 0),
  cantidad_producida numeric NOT NULL DEFAULT 0 CHECK (cantidad_producida >= 0),
  numero_op text,
  lote text NOT NULL,
  fecha_programada date,
  fecha_fin_programada date,
  prioridad integer CHECK (prioridad IS NULL OR prioridad BETWEEN 1 AND 4),
  estado_op text NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_op IN ('Pendiente','En proceso','Terminada','Cancelada')),
  estado_cobertura text NOT NULL DEFAULT 'Cubierto',
  detalle_faltantes jsonb,
  motivo_cancelacion text,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_completado timestamptz,
  fecha_cancelado timestamptz
);

-- 1.8 ENTREGAS
CREATE TABLE public.entregas_op (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_semanales(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  motivo text,
  usuario_email text,
  fecha timestamptz NOT NULL DEFAULT now()
);

-- 1.9 PRODUCCIONES DE SUBPRODUCTO
CREATE TABLE public.subproducto_producciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subproducto_id uuid NOT NULL REFERENCES public.subproductos(id),
  orden_id uuid REFERENCES public.ordenes_semanales(id),
  fecha_produccion timestamptz NOT NULL DEFAULT now(),
  cantidad_inicial numeric NOT NULL CHECK (cantidad_inicial > 0),
  cantidad_actual numeric NOT NULL CHECK (cantidad_actual >= 0),
  costo_unitario_promedio numeric NOT NULL DEFAULT 0 CHECK (costo_unitario_promedio >= 0),
  usuario_email text,
  CONSTRAINT sp_cantidad_actual_le_inicial CHECK (cantidad_actual <= cantidad_inicial)
);

-- 1.10 CARGAS EO
CREATE TABLE public.cargas_eo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_carga text NOT NULL,
  fecha_envio timestamptz NOT NULL DEFAULT now(),
  fecha_recepcion timestamptz,
  estado text NOT NULL DEFAULT 'enviada'
    CHECK (estado IN ('enviada','recibida','rechazada_parcial','rechazada_total')),
  observaciones text,
  usuario_envio_email text,
  usuario_recepcion_email text
);

CREATE TABLE public.carga_eo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id uuid NOT NULL REFERENCES public.cargas_eo(id) ON DELETE CASCADE,
  orden_id uuid NOT NULL REFERENCES public.ordenes_semanales(id),
  cantidad_enviada numeric NOT NULL CHECK (cantidad_enviada > 0),
  cantidad_recibida numeric CHECK (cantidad_recibida IS NULL OR cantidad_recibida >= 0),
  cantidad_rechazada numeric NOT NULL DEFAULT 0 CHECK (cantidad_rechazada >= 0),
  motivo_rechazo text
);

-- 1.11 LOTES DE INSUMO
CREATE TABLE public.insumo_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  lote text NOT NULL,
  cantidad_inicial numeric NOT NULL CHECK (cantidad_inicial > 0),
  cantidad_actual numeric NOT NULL CHECK (cantidad_actual >= 0),
  costo_unitario numeric NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  proveedor_id uuid REFERENCES public.sys_proveedores(id) ON DELETE SET NULL,
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  fecha_vencimiento date,
  estado_calidad text NOT NULL DEFAULT 'aprobado'
    CHECK (estado_calidad IN ('aprobado','rechazado','cuarentena')),
  observaciones text,
  UNIQUE (insumo_id, lote)
);

-- 1.12 LOTES DE PT
CREATE TABLE public.lotes_pt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  lote_op text NOT NULL,
  lote_eo text,
  orden_id uuid NOT NULL REFERENCES public.ordenes_semanales(id),
  carga_eo_id uuid REFERENCES public.cargas_eo(id),
  cantidad_inicial numeric NOT NULL CHECK (cantidad_inicial >= 0),
  cantidad_actual numeric NOT NULL CHECK (cantidad_actual >= 0),
  estado text NOT NULL
    CHECK (estado IN ('en_planta','en_central','en_reproceso','en_bodega','rechazado')),
  fecha_produccion timestamptz NOT NULL DEFAULT now(),
  fecha_esterilizacion timestamptz,
  fecha_vencimiento date,
  UNIQUE (codigo_pt, lote_op, lote_eo, estado)
);

-- 1.13 DESPACHOS
CREATE TABLE public.despachos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  lote_op text NOT NULL,
  lote_eo text,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  cliente text NOT NULL,
  consecutivo text,
  oc text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento text,
  observaciones text,
  usuario_email text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.14 MOVIMIENTOS (unificada)
CREATE TABLE public.movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN (
    'entrada','salida','consumo','ajuste',
    'produccion_subproducto','consumo_subproducto',
    'produccion_pt','envio_central','recepcion_central',
    'reproceso','despacho'
  )),
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo_unitario_momento numeric NOT NULL DEFAULT 0 CHECK (costo_unitario_momento >= 0),
  -- Entidad (exactamente una no nula)
  insumo_id uuid REFERENCES public.insumos(id),
  subproducto_produccion_id uuid REFERENCES public.subproducto_producciones(id),
  lote_pt_id uuid REFERENCES public.lotes_pt(id),
  -- Sub-referencias (opcionales)
  insumo_lote_id uuid REFERENCES public.insumo_lotes(id),
  -- Contexto
  orden_id uuid REFERENCES public.ordenes_semanales(id),
  carga_eo_id uuid REFERENCES public.cargas_eo(id),
  despacho_id uuid REFERENCES public.despachos(id),
  parent_subproducto_produccion_id uuid REFERENCES public.subproducto_producciones(id),
  -- Documentación
  documento_tipo text,
  documento_numero text,
  usuario_email text,
  observaciones text,
  fecha timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mov_una_entidad CHECK (
    (CASE WHEN insumo_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN subproducto_produccion_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN lote_pt_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- 1.15 DEVOLUCIONES
CREATE TABLE public.devoluciones_pt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text NOT NULL REFERENCES public.productos_terminados(codigo_pt),
  lote_op text,
  lote_eo text,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  estado_producto text NOT NULL DEFAULT 'bueno'
    CHECK (estado_producto IN ('bueno','cuarentena','dañado')),
  motivo text,
  usuario_email text,
  fecha timestamptz NOT NULL DEFAULT now()
);

-- 1.16 EVALUACIONES
CREATE TABLE public.evaluaciones_proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid REFERENCES public.sys_proveedores(id) ON DELETE CASCADE,
  proveedor_nombre text,
  proveedor_nit text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  evaluador_email text,
  nota_entrega numeric(3,1) DEFAULT 5.0 CHECK (nota_entrega BETWEEN 0 AND 5),
  nota_calidad numeric(3,1) DEFAULT 5.0 CHECK (nota_calidad BETWEEN 0 AND 5),
  nota_postventa numeric(3,1) DEFAULT 5.0 CHECK (nota_postventa BETWEEN 0 AND 5),
  nota_fumigacion numeric(3,1) DEFAULT 5.0 CHECK (nota_fumigacion BETWEEN 0 AND 5),
  nota_precio numeric(3,1) DEFAULT 5.0 CHECK (nota_precio BETWEEN 0 AND 5),
  promedio numeric(3,2),
  resultado text CHECK (resultado IS NULL OR resultado IN ('Excelente','Bueno','Regular','No Confiable')),
  observaciones text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.17 CAJAS
CREATE TABLE public.cajas_ubicacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_caja text NOT NULL UNIQUE,
  codigo_pt text REFERENCES public.productos_terminados(codigo_pt),
  ubicacion text NOT NULL,
  estado text NOT NULL DEFAULT 'En bodega',
  usuario_email text,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.18 ETIQUETAS IMPRESAS
CREATE TABLE public.etiquetas_impresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pt text REFERENCES public.productos_terminados(codigo_pt),
  lote text,
  cantidad_paquetes int,
  cantidad_cajas int,
  usuario_email text,
  fecha timestamptz NOT NULL DEFAULT now()
);

-- 1.19 BACKUP LOG
CREATE TABLE public.backup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_email text,
  tablas_incluidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  rango_movimientos text,
  total_registros integer NOT NULL DEFAULT 0,
  tamano_bytes bigint,
  fecha timestamptz NOT NULL DEFAULT now()
);

-- 1.20 PROFILES
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nombre text,
  role text NOT NULL DEFAULT 'consulta'
    CHECK (role IN ('admin','operador','consulta')),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 1.21 SYS_CONFIG
CREATE TABLE public.sys_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_por_email text
);

-- 1.22 USER PREFERENCES
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notif_vistos jsonb NOT NULL DEFAULT '{}'::jsonb,
  notif_silenciados jsonb NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- SECCIÓN 2 · ÍNDICES
-- =============================================================

-- Insumos
CREATE INDEX insumos_categoria_idx ON public.insumos(categoria_id) WHERE categoria_id IS NOT NULL;
CREATE INDEX insumos_activo_idx ON public.insumos(estado_activo) WHERE estado_activo = true;
CREATE INDEX insumos_sufijo_num_idx ON public.insumos ((NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::bigint)) WHERE codigo ~ '\d';

-- Subproductos
CREATE INDEX subproductos_categoria_idx ON public.subproductos(categoria_id) WHERE categoria_id IS NOT NULL;
CREATE INDEX subproductos_sufijo_num_idx ON public.subproductos ((NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::bigint)) WHERE codigo ~ '\d';

-- PT
CREATE INDEX productos_terminados_categoria_idx ON public.productos_terminados(categoria_id) WHERE categoria_id IS NOT NULL;
CREATE INDEX productos_terminados_sufijo_num_idx ON public.productos_terminados ((NULLIF(regexp_replace(codigo_pt, '\D', '', 'g'), '')::bigint)) WHERE codigo_pt ~ '\d';

-- Recetas
CREATE INDEX bom_recetas_pt_idx ON public.bom_recetas(codigo_pt);
CREATE INDEX bom_recetas_insumo_idx ON public.bom_recetas(insumo_id);
CREATE INDEX subproducto_recetas_sub_idx ON public.subproducto_recetas(subproducto_id);
CREATE INDEX subproducto_recetas_insumo_idx ON public.subproducto_recetas(insumo_id);
CREATE INDEX subproducto_subproductos_padre_idx ON public.subproducto_subproductos(subproducto_padre_id);
CREATE INDEX subproducto_subproductos_hijo_idx ON public.subproducto_subproductos(subproducto_hijo_id);
CREATE INDEX paquete_subproductos_pt_idx ON public.paquete_subproductos(codigo_pt);
CREATE INDEX paquete_subproductos_sub_idx ON public.paquete_subproductos(subproducto_id);

-- Órdenes
CREATE UNIQUE INDEX ordenes_numero_op_unique ON public.ordenes_semanales(numero_op) WHERE numero_op IS NOT NULL;
CREATE UNIQUE INDEX ordenes_lote_unique ON public.ordenes_semanales(lote);
CREATE INDEX ordenes_estado_idx ON public.ordenes_semanales(estado_op);
CREATE INDEX ordenes_prioridad_idx ON public.ordenes_semanales(prioridad NULLS LAST, fecha_programada NULLS LAST, fecha_creacion DESC);
CREATE INDEX ordenes_pt_idx ON public.ordenes_semanales(codigo_pt);

-- Entregas
CREATE INDEX entregas_orden_idx ON public.entregas_op(orden_id, fecha DESC);

-- Producciones de subproducto
CREATE INDEX subprod_prod_sub_idx ON public.subproducto_producciones(subproducto_id, fecha_produccion ASC)
  WHERE cantidad_actual > 0;
CREATE INDEX subprod_prod_orden_idx ON public.subproducto_producciones(orden_id) WHERE orden_id IS NOT NULL;

-- Cargas EO
CREATE INDEX cargas_eo_estado_idx ON public.cargas_eo(estado);
CREATE INDEX cargas_eo_fecha_idx ON public.cargas_eo(fecha_envio DESC);
CREATE INDEX carga_eo_items_carga_idx ON public.carga_eo_items(carga_id);
CREATE INDEX carga_eo_items_orden_idx ON public.carga_eo_items(orden_id);

-- Lotes de insumo
CREATE INDEX insumo_lotes_insumo_lote_idx ON public.insumo_lotes(insumo_id, lote);
CREATE INDEX insumo_lotes_fifo_idx ON public.insumo_lotes(insumo_id, fecha_ingreso ASC)
  WHERE cantidad_actual > 0 AND estado_calidad = 'aprobado';
CREATE INDEX insumo_lotes_vencimiento_idx ON public.insumo_lotes(fecha_vencimiento)
  WHERE fecha_vencimiento IS NOT NULL AND cantidad_actual > 0;

-- Lotes PT
CREATE INDEX lotes_pt_pt_lote_op_idx ON public.lotes_pt(codigo_pt, lote_op);
CREATE INDEX lotes_pt_lote_eo_idx ON public.lotes_pt(lote_eo) WHERE lote_eo IS NOT NULL;
CREATE INDEX lotes_pt_estado_idx ON public.lotes_pt(estado);
CREATE INDEX lotes_pt_orden_idx ON public.lotes_pt(orden_id);

-- Movimientos
CREATE INDEX movimientos_fecha_idx ON public.movimientos(fecha DESC, id DESC);
CREATE INDEX movimientos_insumo_idx ON public.movimientos(insumo_id, fecha DESC, id DESC) WHERE insumo_id IS NOT NULL;
CREATE INDEX movimientos_insumo_lote_idx ON public.movimientos(insumo_lote_id) WHERE insumo_lote_id IS NOT NULL;
CREATE INDEX movimientos_subprod_idx ON public.movimientos(subproducto_produccion_id) WHERE subproducto_produccion_id IS NOT NULL;
CREATE INDEX movimientos_lote_pt_idx ON public.movimientos(lote_pt_id) WHERE lote_pt_id IS NOT NULL;
CREATE INDEX movimientos_orden_idx ON public.movimientos(orden_id, fecha DESC) WHERE orden_id IS NOT NULL;
CREATE INDEX movimientos_parent_prod_idx ON public.movimientos(parent_subproducto_produccion_id)
  WHERE parent_subproducto_produccion_id IS NOT NULL;
CREATE INDEX movimientos_carga_idx ON public.movimientos(carga_eo_id) WHERE carga_eo_id IS NOT NULL;

-- Despachos
CREATE INDEX despachos_fecha_idx ON public.despachos(fecha DESC);
CREATE INDEX despachos_pt_idx ON public.despachos(codigo_pt);
CREATE INDEX despachos_lotes_idx ON public.despachos(codigo_pt, lote_op, lote_eo);

-- Devoluciones
CREATE INDEX devoluciones_pt_fecha_idx ON public.devoluciones_pt(fecha DESC);

-- Cajas
CREATE INDEX cajas_estado_idx ON public.cajas_ubicacion(estado) WHERE estado = 'En bodega';
CREATE INDEX cajas_ubicacion_idx ON public.cajas_ubicacion(ubicacion);

-- =============================================================
-- SECCIÓN 3 · HELPERS
-- =============================================================

-- 3.1 Rol del usuario actual
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN activo THEN role ELSE 'inactivo' END
     FROM public.profiles WHERE user_id = auth.uid()),
    'anon'
  );
$$;

-- 3.2 Email del usuario actual
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid();
$$;

-- 3.3 Guard de escritura
CREATE OR REPLACE FUNCTION public.validar_escritura()
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.current_user_role() NOT IN ('admin','operador') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol de operador o administrador.';
  END IF;
END;
$$;

-- 3.4 Siguiente código
CREATE OR REPLACE FUNCTION public.siguiente_codigo(p_prefijo text, p_tabla text)
RETURNS text
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
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
  ELSIF p_tabla = 'ordenes_semanales' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(numero_op FROM char_length(p_prefijo)+1), '\D','','g'),'')::bigint), 0)
      INTO v_max FROM public.ordenes_semanales WHERE numero_op LIKE p_prefijo || '%';
  ELSE
    RAISE EXCEPTION 'Tabla no soportada por siguiente_codigo: %', p_tabla;
  END IF;
  RETURN lpad((v_max + 1)::text, 4, '0');
END;
$$;

-- 3.5 Siguiente código de caja
CREATE OR REPLACE FUNCTION public.siguiente_codigo_caja(p_codigo_pt text, p_lote text)
RETURNS int
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
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
END;
$$;

-- 3.6 Costo de subproducto (recursivo, interno)
CREATE OR REPLACE FUNCTION public.subproducto_costo(
  p_sub_id uuid, p_visited uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS numeric
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
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
END;
$$;

-- 3.7 Costo de paquete (interno)
CREATE OR REPLACE FUNCTION public.paquete_costo(p_pt text)
RETURNS numeric
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
DECLARE ins_directos numeric := 0; subs numeric := 0;
BEGIN
  SELECT COALESCE(SUM(
    (SELECT costo_unitario FROM public.insumos WHERE id = br.insumo_id) * br.cantidad_por_unidad
  ), 0) INTO ins_directos FROM public.bom_recetas br WHERE br.codigo_pt = p_pt;
  SELECT COALESCE(SUM(
    public.subproducto_costo(ps.subproducto_id) * ps.cantidad
  ), 0) INTO subs FROM public.paquete_subproductos ps WHERE ps.codigo_pt = p_pt;
  RETURN ins_directos + subs;
END;
$$;

-- 3.8 Costos de todo el catálogo
CREATE OR REPLACE FUNCTION public.costos_todos()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_sub_costo jsonb; v_paq_costo jsonb;
BEGIN
  SELECT jsonb_object_agg(s.id::text, public.subproducto_costo(s.id)) INTO v_sub_costo FROM public.subproductos s;
  SELECT jsonb_object_agg(p.codigo_pt, public.paquete_costo(p.codigo_pt)) INTO v_paq_costo FROM public.productos_terminados p;
  RETURN jsonb_build_object(
    'subproducto_costo', COALESCE(v_sub_costo, '{}'::jsonb),
    'paquete_costo', COALESCE(v_paq_costo, '{}'::jsonb)
  );
END;
$$;

-- =============================================================
-- FIN PARTE 1
--
-- Siguiente: Parte 2 (RPCs de negocio)
--   · Consumos FIFO (insumo, subproducto)
--   · Simulación de cobertura
--   · Registrar entrada / salida / ajuste
--   · Guardar subproducto / paquete
--   · Producir / consumir subproducto
--   · Confirmar / cancelar orden
--   · Registrar entrega
--   · Cargas EO (crear, recibir)
--   · Despachar
--   · Devolver PT
--   · Trazabilidad (forward, backward)
--   · Reservar cajas
-- =============================================================

-- =============================================================
-- SECCIÓN 4 · RPCs DE CONSUMO FIFO
-- =============================================================

-- 4.1 Consumo FIFO de insumo (con lote) o directo (sin lote)
CREATE OR REPLACE FUNCTION public.consumir_insumo_fifo(
  p_insumo_id uuid,
  p_cantidad numeric,
  p_motivo text,
  p_orden_id uuid DEFAULT NULL,
  p_tipo text DEFAULT 'consumo',
  p_parent_produccion_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_insumo record;
  v_restante numeric := p_cantidad;
  v_tomar numeric;
  v_lote record;
  v_detalle jsonb := '[]'::jsonb;
  v_costo numeric;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'Cantidad debe ser > 0';
  END IF;
  IF p_tipo NOT IN ('consumo','salida') THEN
    RAISE EXCEPTION 'Tipo inválido: %', p_tipo;
  END IF;

  SELECT * INTO v_insumo FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado: %', p_insumo_id; END IF;
  v_costo := v_insumo.costo_unitario;

  IF v_insumo.existencia_actual < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para insumo %: disponible %, requerido %',
      p_insumo_id, v_insumo.existencia_actual, p_cantidad;
  END IF;

  -- Insumo sin lote: consumo directo
  IF NOT v_insumo.requiere_lote THEN
    INSERT INTO public.movimientos
      (tipo, cantidad, insumo_id, orden_id, costo_unitario_momento,
       observaciones, parent_subproducto_produccion_id)
    VALUES
      (p_tipo, p_cantidad, p_insumo_id, p_orden_id, v_costo,
       p_motivo, p_parent_produccion_id);
    UPDATE public.insumos SET existencia_actual = existencia_actual - p_cantidad
      WHERE id = p_insumo_id;
    RETURN jsonb_build_object(
      'detalle', jsonb_build_array(jsonb_build_object('sin_lote', true, 'cantidad', p_cantidad))
    );
  END IF;

  -- Insumo con lote: FIFO
  FOR v_lote IN
    SELECT * FROM public.insumo_lotes
    WHERE insumo_id = p_insumo_id AND cantidad_actual > 0 AND estado_calidad = 'aprobado'
    ORDER BY fecha_ingreso ASC, id ASC
  LOOP
    IF v_restante <= 0 THEN EXIT; END IF;
    v_tomar := LEAST(v_restante, v_lote.cantidad_actual);
    UPDATE public.insumo_lotes SET cantidad_actual = cantidad_actual - v_tomar
      WHERE id = v_lote.id;
    INSERT INTO public.movimientos
      (tipo, cantidad, insumo_id, insumo_lote_id, orden_id,
       costo_unitario_momento, observaciones, parent_subproducto_produccion_id)
    VALUES
      (p_tipo, v_tomar, p_insumo_id, v_lote.id, p_orden_id,
       COALESCE(v_lote.costo_unitario, v_costo), p_motivo, p_parent_produccion_id);
    v_restante := v_restante - v_tomar;
    v_detalle := v_detalle || jsonb_build_object(
      'lote_id', v_lote.id, 'lote', v_lote.lote, 'cantidad', v_tomar
    );
  END LOOP;

  IF v_restante > 0 THEN
    RAISE EXCEPTION 'Stock insuficiente en lotes: faltan % unidades', v_restante;
  END IF;

  UPDATE public.insumos SET existencia_actual = existencia_actual - p_cantidad
    WHERE id = p_insumo_id;

  RETURN jsonb_build_object('detalle', v_detalle);
END;
$$;

-- 4.2 Consumo recursivo de subproducto (FIFO + auto-producción)
CREATE OR REPLACE FUNCTION public.consumir_subproducto_recursivo(
  p_sub_id uuid,
  p_cantidad numeric,
  p_orden_id uuid DEFAULT NULL,
  p_visited uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub record;
  v_restante numeric := p_cantidad;
  v_prod record;
  v_tomar numeric;
  v_consumido_stock numeric := 0;
  v_faltante numeric;
  v_nueva_prod_id uuid;
  v_hijo record;
  v_receta record;
  v_detalle jsonb := '[]'::jsonb;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RETURN jsonb_build_object('consumido_stock', 0, 'auto_producido', 0, 'detalle', '[]'::jsonb);
  END IF;
  IF p_sub_id = ANY(p_visited) THEN
    RAISE EXCEPTION 'Ciclo detectado en subproductos (id=%)', p_sub_id;
  END IF;
  IF array_length(p_visited,1) > 20 THEN
    RAISE EXCEPTION 'Profundidad máxima excedida (id=%)', p_sub_id;
  END IF;

  SELECT * INTO v_sub FROM public.subproductos WHERE id = p_sub_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subproducto no encontrado: %', p_sub_id; END IF;

  -- Consumir del stock (FIFO por fecha_produccion)
  FOR v_prod IN
    SELECT * FROM public.subproducto_producciones
    WHERE subproducto_id = p_sub_id AND cantidad_actual > 0
    ORDER BY fecha_produccion ASC, id ASC
  LOOP
    IF v_restante <= 0 THEN EXIT; END IF;
    v_tomar := LEAST(v_restante, v_prod.cantidad_actual);
    UPDATE public.subproducto_producciones SET cantidad_actual = cantidad_actual - v_tomar
      WHERE id = v_prod.id;
    INSERT INTO public.movimientos
      (tipo, cantidad, subproducto_produccion_id, orden_id,
       costo_unitario_momento, observaciones)
    VALUES
      ('consumo_subproducto', v_tomar, v_prod.id, p_orden_id,
       v_prod.costo_unitario_promedio, 'Consumo de subproducto');
    UPDATE public.subproductos SET existencia_actual = existencia_actual - v_tomar
      WHERE id = p_sub_id;
    v_consumido_stock := v_consumido_stock + v_tomar;
    v_restante := v_restante - v_tomar;
    v_detalle := v_detalle || jsonb_build_object(
      'produccion_id', v_prod.id, 'cantidad', v_tomar, 'de_stock', true
    );
  END LOOP;

  -- Si falta, auto-producir (con orden_id = OP que la originó)
  IF v_restante > 0 THEN
    v_faltante := v_restante;
    INSERT INTO public.subproducto_producciones
      (subproducto_id, orden_id, cantidad_inicial, cantidad_actual, usuario_email)
    VALUES
      (p_sub_id, p_orden_id, v_faltante, v_faltante, public.current_user_email())
    RETURNING id INTO v_nueva_prod_id;

    -- Consumir hijos recursivamente
    FOR v_hijo IN
      SELECT subproducto_hijo_id, cantidad_por_unidad
      FROM public.subproducto_subproductos WHERE subproducto_padre_id = p_sub_id
    LOOP
      PERFORM public.consumir_subproducto_recursivo(
        v_hijo.subproducto_hijo_id,
        v_hijo.cantidad_por_unidad * v_faltante,
        p_orden_id,
        p_visited || p_sub_id
      );
    END LOOP;

    -- Consumir insumos de la receta (con parent_produccion_id)
    FOR v_receta IN
      SELECT insumo_id, cantidad_por_unidad, factor_receta
      FROM public.subproducto_recetas WHERE subproducto_id = p_sub_id
    LOOP
      PERFORM public.consumir_insumo_fifo(
        v_receta.insumo_id,
        v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta, 1) * v_faltante,
        'Auto-producción ' || v_sub.nombre,
        p_orden_id,
        'consumo',
        v_nueva_prod_id
      );
    END LOOP;

    -- Movimientos de producción + consumo
    INSERT INTO public.movimientos
      (tipo, cantidad, subproducto_produccion_id, orden_id, observaciones)
    VALUES
      ('produccion_subproducto', v_faltante, v_nueva_prod_id, p_orden_id, 'Auto-producción');
    INSERT INTO public.movimientos
      (tipo, cantidad, subproducto_produccion_id, orden_id, observaciones)
    VALUES
      ('consumo_subproducto', v_faltante, v_nueva_prod_id, p_orden_id, 'Consumo inmediato');

    -- La producción queda consumida al 100%
    UPDATE public.subproducto_producciones SET cantidad_actual = 0
      WHERE id = v_nueva_prod_id;

    v_detalle := v_detalle || jsonb_build_object(
      'produccion_id', v_nueva_prod_id, 'cantidad', v_faltante, 'auto_producido', true
    );
  END IF;

  RETURN jsonb_build_object(
    'subproducto_id', p_sub_id,
    'consumido_stock', v_consumido_stock,
    'auto_producido', v_restante > 0,
    'detalle', v_detalle
  );
END;
$$;

-- =============================================================
-- SECCIÓN 5 · RPCs DE SIMULACIÓN
-- =============================================================

-- 5.1 Simular consumo de PT
CREATE OR REPLACE FUNCTION public.simular_consumo_pt(p_codigo_pt text, p_cantidad numeric)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_state jsonb := jsonb_build_object('sub_stock', '{}'::jsonb, 'insumo_req', '{}'::jsonb);
  v_sub record;
  v_ins record;
BEGIN
  FOR v_sub IN
    SELECT subproducto_id, cantidad FROM public.paquete_subproductos WHERE codigo_pt = p_codigo_pt
  LOOP
    v_state := public.simular_consumo_subproducto(
      v_sub.subproducto_id, v_sub.cantidad * p_cantidad, v_state, ARRAY[]::uuid[]
    );
  END LOOP;
  FOR v_ins IN
    SELECT insumo_id, cantidad_por_unidad FROM public.bom_recetas WHERE codigo_pt = p_codigo_pt
  LOOP
    v_state := jsonb_set(
      v_state, ARRAY['insumo_req', v_ins.insumo_id::text],
      to_jsonb(COALESCE((v_state->'insumo_req'->>v_ins.insumo_id::text)::numeric, 0)
               + v_ins.cantidad_por_unidad * p_cantidad)
    );
  END LOOP;
  RETURN v_state;
END;
$$;

-- 5.2 Simular consumo de subproducto (recursivo)
CREATE OR REPLACE FUNCTION public.simular_consumo_subproducto(
  p_sub_id uuid, p_cantidad numeric, p_state jsonb,
  p_visited uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock_actual numeric;
  v_faltante numeric;
  v_receta record;
  v_hijo record;
  v_stock_map jsonb := COALESCE(p_state->'sub_stock', '{}'::jsonb);
  v_insumo_req jsonb := COALESCE(p_state->'insumo_req', '{}'::jsonb);
  v_key text;
BEGIN
  IF p_sub_id = ANY(p_visited) THEN RAISE EXCEPTION 'Ciclo detectado en subproductos'; END IF;
  IF array_length(p_visited,1) > 20 THEN RAISE EXCEPTION 'Profundidad máxima excedida'; END IF;
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

  FOR v_hijo IN
    SELECT subproducto_hijo_id, cantidad_por_unidad
    FROM public.subproducto_subproductos WHERE subproducto_padre_id = p_sub_id
  LOOP
    p_state := public.simular_consumo_subproducto(
      v_hijo.subproducto_hijo_id,
      v_hijo.cantidad_por_unidad * v_faltante,
      p_state || jsonb_build_object('sub_stock', v_stock_map),
      p_visited || p_sub_id
    );
    v_stock_map := p_state->'sub_stock';
    v_insumo_req := p_state->'insumo_req';
  END LOOP;

  FOR v_receta IN
    SELECT insumo_id, cantidad_por_unidad, factor_receta
    FROM public.subproducto_recetas WHERE subproducto_id = p_sub_id
  LOOP
    v_key := v_receta.insumo_id::text;
    v_insumo_req := jsonb_set(v_insumo_req, ARRAY[v_key],
      to_jsonb(COALESCE((v_insumo_req->>v_key)::numeric, 0)
               + v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta,1) * v_faltante));
  END LOOP;

  RETURN jsonb_build_object('sub_stock', v_stock_map, 'insumo_req', v_insumo_req);
END;
$$;

-- =============================================================
-- SECCIÓN 6 · RPCs DE INVENTARIO
-- =============================================================

-- 6.1 Registrar entrada de insumo
CREATE OR REPLACE FUNCTION public.registrar_entrada(
  p_insumo_id uuid,
  p_cantidad numeric,
  p_proveedor_id uuid DEFAULT NULL,
  p_costo_unitario numeric DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_rendimiento_real numeric DEFAULT NULL,
  p_lote_insumo text DEFAULT NULL,
  p_fecha_vencimiento date DEFAULT NULL,
  p_estado_calidad text DEFAULT 'aprobado',
  p_numero_factura text DEFAULT NULL,
  p_numero_oc text DEFAULT NULL,
  p_numero_entrada_almacen text DEFAULT NULL,
  p_cantidad_pendiente_oc numeric DEFAULT NULL,
  p_observaciones_calidad text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_insumo record;
  v_cadena jsonb;
  v_factor numeric := 1;
  v_factor_usar numeric;
  v_cant_consumo numeric;
  v_costo_consumo numeric;
  v_nuevo_costo numeric;
  v_lote_final text;
  v_existencia_antes numeric;
  v_lote_id uuid;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_estado_calidad NOT IN ('aprobado','rechazado','cuarentena') THEN
    RAISE EXCEPTION 'Estado de calidad inválido: %', p_estado_calidad;
  END IF;

  SELECT * INTO v_insumo FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;

  IF v_insumo.requiere_lote AND (p_lote_insumo IS NULL OR trim(p_lote_insumo) = '') THEN
    RAISE EXCEPTION 'El lote es obligatorio para este insumo';
  END IF;
  IF v_insumo.requiere_vencimiento AND p_fecha_vencimiento IS NULL THEN
    RAISE EXCEPTION 'La fecha de vencimiento es obligatoria para este insumo';
  END IF;

  v_cadena := COALESCE(v_insumo.conversiones, '[]'::jsonb);
  IF jsonb_array_length(v_cadena) > 1 THEN
    SELECT COALESCE(EXP(SUM(LN(GREATEST((elem->>'factor')::numeric, 0.0000001)))), 1)
      INTO v_factor
    FROM jsonb_array_elements(v_cadena) WITH ORDINALITY AS t(elem, ord)
    WHERE ord < jsonb_array_length(v_cadena);
  END IF;

  v_factor_usar := CASE WHEN p_rendimiento_real > 0 THEN p_rendimiento_real ELSE v_factor END;
  v_cant_consumo := p_cantidad * v_factor_usar;
  v_lote_final := COALESCE(NULLIF(trim(p_lote_insumo), ''), 'SIN_LOTE_' || extract(epoch from now())::bigint);
  v_existencia_antes := v_insumo.existencia_actual;

  IF p_costo_unitario IS NOT NULL AND p_costo_unitario > 0 THEN
    v_costo_consumo := p_costo_unitario / v_factor_usar;
    IF (v_existencia_antes + v_cant_consumo) > 0 THEN
      v_nuevo_costo := ((v_existencia_antes * v_insumo.costo_unitario)
                        + (v_cant_consumo * v_costo_consumo))
                       / (v_existencia_antes + v_cant_consumo);
    ELSE
      v_nuevo_costo := v_costo_consumo;
    END IF;
  ELSE
    v_costo_consumo := v_insumo.costo_unitario;
    v_nuevo_costo := v_insumo.costo_unitario;
  END IF;

  -- Insertar lote (solo si aprobado)
  IF p_estado_calidad = 'aprobado' THEN
    INSERT INTO public.insumo_lotes
      (insumo_id, lote, cantidad_inicial, cantidad_actual, costo_unitario,
       proveedor_id, fecha_vencimiento, estado_calidad, observaciones)
    VALUES
      (p_insumo_id, v_lote_final, v_cant_consumo, v_cant_consumo, v_costo_consumo,
       p_proveedor_id, p_fecha_vencimiento, p_estado_calidad, p_observaciones_calidad)
    ON CONFLICT (insumo_id, lote) DO UPDATE
      SET cantidad_inicial = public.insumo_lotes.cantidad_inicial + EXCLUDED.cantidad_inicial,
          cantidad_actual = public.insumo_lotes.cantidad_actual + EXCLUDED.cantidad_actual,
          costo_unitario = EXCLUDED.costo_unitario
    RETURNING id INTO v_lote_id;

    UPDATE public.insumos
      SET existencia_actual = existencia_actual + v_cant_consumo,
          costo_unitario = v_nuevo_costo
      WHERE id = p_insumo_id;
  END IF;

  INSERT INTO public.movimientos
    (tipo, cantidad, insumo_id, insumo_lote_id, costo_unitario_momento,
     documento_tipo, documento_numero, observaciones, usuario_email)
  VALUES
    ('entrada', v_cant_consumo, p_insumo_id, v_lote_id, v_costo_consumo,
     p_numero_factura, p_numero_oc,
     COALESCE(p_motivo, '') || CASE WHEN p_estado_calidad <> 'aprobado'
       THEN ' [CALIDAD: ' || p_estado_calidad || ']' ELSE '' END,
     public.current_user_email());

  RETURN jsonb_build_object(
    'cantidad_consumo', v_cant_consumo,
    'existencia_nueva', CASE WHEN p_estado_calidad = 'aprobado'
                             THEN v_existencia_antes + v_cant_consumo
                             ELSE v_existencia_antes END,
    'costo_unitario', v_nuevo_costo,
    'estado_calidad', p_estado_calidad,
    'lote_id', v_lote_id
  );
END;
$$;

-- 6.2 Registrar entrada multi-lote
CREATE OR REPLACE FUNCTION public.registrar_entrada_multi_lote(
  p_insumo_id uuid,
  p_lotes jsonb,
  p_proveedor_id uuid DEFAULT NULL,
  p_costo_unitario numeric DEFAULT NULL,
  p_estado_calidad text DEFAULT 'aprobado',
  p_numero_factura text DEFAULT NULL,
  p_numero_oc text DEFAULT NULL,
  p_numero_entrada_almacen text DEFAULT NULL,
  p_cantidad_pendiente_oc numeric DEFAULT NULL,
  p_observaciones_calidad text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_count int := 0;
  v_total numeric := 0;
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
    PERFORM public.registrar_entrada(
      p_insumo_id,
      (v_item->>'cantidad')::numeric,
      p_proveedor_id, p_costo_unitario, 'Entrada multi-lote',
      NULL,
      trim(v_item->>'lote'),
      NULLIF(v_item->>'fecha_vencimiento','')::date,
      p_estado_calidad,
      p_numero_factura, p_numero_oc, p_numero_entrada_almacen,
      p_cantidad_pendiente_oc, p_observaciones_calidad
    );
    v_total := v_total + (v_item->>'cantidad')::numeric;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('lotes_insertados', v_count, 'cantidad_total', v_total);
END;
$$;

-- 6.3 Registrar salida manual
CREATE OR REPLACE FUNCTION public.registrar_salida(
  p_insumo_id uuid, p_cantidad numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_existencia numeric;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  PERFORM public.consumir_insumo_fifo(
    p_insumo_id, p_cantidad,
    'Salida: ' || COALESCE(p_motivo, 'Sin motivo'),
    NULL, 'salida', NULL
  );
  SELECT existencia_actual INTO v_existencia FROM public.insumos WHERE id = p_insumo_id;
  RETURN jsonb_build_object('existencia_nueva', v_existencia);
END;
$$;

-- 6.4 Ajustar inventario (conteo físico)
CREATE OR REPLACE FUNCTION public.ajustar_inventario(
  p_insumo_id uuid, p_nueva_existencia numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
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
    -- Ajuste positivo: crear lote AJUSTE
    INSERT INTO public.insumo_lotes
      (insumo_id, lote, cantidad_inicial, cantidad_actual, costo_unitario, estado_calidad)
    VALUES
      (p_insumo_id, 'AJUSTE_' || extract(epoch from now())::bigint, v_dif, v_dif, v_insumo.costo_unitario, 'aprobado')
    RETURNING id INTO v_dif;
    INSERT INTO public.movimientos
      (tipo, cantidad, insumo_id, insumo_lote_id, costo_unitario_momento, observaciones, usuario_email)
    VALUES
      ('ajuste', v_dif, p_insumo_id, v_dif, v_insumo.costo_unitario,
       COALESCE(p_motivo, 'Ajuste positivo'), public.current_user_email());
    UPDATE public.insumos SET existencia_actual = p_nueva_existencia WHERE id = p_insumo_id;
  ELSE
    PERFORM public.consumir_insumo_fifo(
      p_insumo_id, ABS(v_dif),
      COALESCE(p_motivo, 'Ajuste negativo'),
      NULL, 'salida', NULL
    );
  END IF;

  RETURN jsonb_build_object('existencia_nueva', p_nueva_existencia);
END;
$$;

-- 6.5 Ajustar subproducto
CREATE OR REPLACE FUNCTION public.ajustar_subproducto(
  p_id uuid, p_nueva_existencia numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_sub record; v_dif numeric;
BEGIN
  PERFORM public.validar_escritura();
  IF p_nueva_existencia IS NULL OR p_nueva_existencia < 0 THEN
    RAISE EXCEPTION 'Existencia no puede ser negativa';
  END IF;
  SELECT * INTO v_sub FROM public.subproductos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subproducto no encontrado'; END IF;
  v_dif := p_nueva_existencia - v_sub.existencia_actual;
  IF v_dif = 0 THEN RETURN jsonb_build_object('existencia_nueva', p_nueva_existencia); END IF;

  UPDATE public.subproductos SET existencia_actual = p_nueva_existencia WHERE id = p_id;

  -- Si es positivo, crear producción de ajuste
  IF v_dif > 0 THEN
    INSERT INTO public.subproducto_producciones
      (subproducto_id, orden_id, cantidad_inicial, cantidad_actual, usuario_email)
    VALUES
      (p_id, NULL, v_dif, v_dif, public.current_user_email())
    RETURNING id INTO v_dif;
    INSERT INTO public.movimientos
      (tipo, cantidad, subproducto_produccion_id, observaciones)
    VALUES
      ('ajuste', v_dif, v_dif, COALESCE(p_motivo, 'Ajuste subproducto'));
  END IF;

  RETURN jsonb_build_object('existencia_nueva', p_nueva_existencia);
END;
$$;

-- 6.6 Registrar devolución a proveedor
CREATE OR REPLACE FUNCTION public.registrar_devolucion(
  p_insumo_id uuid, p_cantidad numeric, p_proveedor_id uuid,
  p_motivo text DEFAULT NULL, p_lote text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
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
    SELECT cantidad_actual INTO v_tomar
      FROM public.insumo_lotes
      WHERE insumo_id = p_insumo_id AND lote = v_lote_limpio FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lote % no existe', v_lote_limpio; END IF;
    IF v_tomar < p_cantidad THEN
      RAISE EXCEPTION 'Lote % solo tiene % disponibles', v_lote_limpio, v_tomar;
    END IF;
    UPDATE public.insumo_lotes SET cantidad_actual = cantidad_actual - p_cantidad
      WHERE insumo_id = p_insumo_id AND lote = v_lote_limpio;
    INSERT INTO public.movimientos
      (tipo, cantidad, insumo_id, insumo_lote_id, costo_unitario_momento,
       observaciones, usuario_email)
    SELECT 'salida', p_cantidad, p_insumo_id, id, v_insumo.costo_unitario,
      COALESCE(p_motivo, 'Devolución a proveedor'), public.current_user_email()
    FROM public.insumo_lotes WHERE insumo_id = p_insumo_id AND lote = v_lote_limpio;
  ELSE
    -- LIFO
    FOR v_lote_rec IN
      SELECT id, cantidad_actual FROM public.insumo_lotes
      WHERE insumo_id = p_insumo_id AND cantidad_actual > 0
      ORDER BY fecha_ingreso DESC, id DESC
    LOOP
      IF v_restante <= 0 THEN EXIT; END IF;
      v_tomar := LEAST(v_restante, v_lote_rec.cantidad_actual);
      UPDATE public.insumo_lotes SET cantidad_actual = cantidad_actual - v_tomar
        WHERE id = v_lote_rec.id;
      INSERT INTO public.movimientos
        (tipo, cantidad, insumo_id, insumo_lote_id, costo_unitario_momento,
         observaciones, usuario_email)
      VALUES
        ('salida', v_tomar, p_insumo_id, v_lote_rec.id, v_insumo.costo_unitario,
         COALESCE(p_motivo, 'Devolución a proveedor'), public.current_user_email());
      v_restante := v_restante - v_tomar;
    END LOOP;
    IF v_restante > 0 THEN
      RAISE EXCEPTION 'No hay saldo suficiente en lotes para devolver %', p_cantidad;
    END IF;
  END IF;

  UPDATE public.insumos SET existencia_actual = existencia_actual - p_cantidad
    WHERE id = p_insumo_id RETURNING existencia_actual INTO v_existencia_nueva;

  RETURN jsonb_build_object('existencia_nueva', v_existencia_nueva);
END;
$$;

-- 6.7 Ajustar costo de insumo
CREATE OR REPLACE FUNCTION public.ajustar_costo_insumo(
  p_insumo_id uuid, p_costo_nuevo numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_insumo record;
BEGIN
  PERFORM public.validar_escritura();
  IF p_costo_nuevo IS NULL OR p_costo_nuevo < 0 THEN RAISE EXCEPTION 'Costo no puede ser negativo'; END IF;
  SELECT * INTO v_insumo FROM public.insumos WHERE id = p_insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;
  UPDATE public.insumos SET costo_unitario = p_costo_nuevo WHERE id = p_insumo_id;
  RETURN jsonb_build_object('costo_anterior', v_insumo.costo_unitario, 'costo_nuevo', p_costo_nuevo);
END;
$$;

-- =============================================================
-- SECCIÓN 7 · RPCs DE CATÁLOGO
-- =============================================================

-- 7.1 Guardar subproducto
CREATE OR REPLACE FUNCTION public.guardar_subproducto(
  p_id uuid,
  p_codigo text,
  p_nombre text,
  p_existencia numeric,
  p_categoria_id uuid DEFAULT NULL,
  p_receta jsonb DEFAULT '[]'::jsonb,
  p_hijos jsonb DEFAULT '[]'::jsonb,
  p_tipo text DEFAULT 'ambos'
) RETURNS public.subproductos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub public.subproductos%ROWTYPE;
  v_row jsonb;
  v_hijo_ids uuid[] := ARRAY[]::uuid[];
  v_ciclo boolean;
BEGIN
  PERFORM public.validar_escritura();
  IF p_nombre IS NULL OR length(trim(p_nombre)) = 0 THEN RAISE EXCEPTION 'Nombre obligatorio'; END IF;
  IF p_tipo NOT IN ('intermedio','final','ambos') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;

  IF p_hijos IS NOT NULL THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_hijos) LOOP
      v_hijo_ids := v_hijo_ids || (v_row->>'subproducto_id')::uuid;
    END LOOP;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.subproductos (codigo, nombre, categoria_id, existencia_actual, tipo)
    VALUES (p_codigo, p_nombre, p_categoria_id, COALESCE(p_existencia, 0), p_tipo)
    RETURNING * INTO v_sub;
  ELSE
    IF array_length(v_hijo_ids, 1) > 0 THEN
      WITH RECURSIVE descendientes AS (
        SELECT unnest(v_hijo_ids) AS id
        UNION
        SELECT ss.subproducto_hijo_id FROM public.subproducto_subproductos ss
          JOIN descendientes d ON ss.subproducto_padre_id = d.id
      )
      SELECT EXISTS (SELECT 1 FROM descendientes WHERE id = p_id) INTO v_ciclo;
      IF v_ciclo THEN RAISE EXCEPTION 'Ciclo detectado'; END IF;
    END IF;
    IF p_id = ANY(v_hijo_ids) THEN RAISE EXCEPTION 'Auto-referencia'; END IF;

    UPDATE public.subproductos
      SET nombre = p_nombre, categoria_id = p_categoria_id, tipo = p_tipo
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
END;
$$;

-- 7.2 Guardar paquete
CREATE OR REPLACE FUNCTION public.guardar_paquete(
  p_codigo_pt text,
  p_es_nuevo boolean,
  p_nombre text,
  p_subproductos jsonb DEFAULT '[]'::jsonb,
  p_insumos jsonb DEFAULT '[]'::jsonb,
  p_unidades_por_caja integer DEFAULT 1,
  p_precio_venta numeric DEFAULT NULL,
  p_categoria_id uuid DEFAULT NULL,
  p_plantilla_etiqueta text DEFAULT 'esteril_proclides',
  p_vida_util_meses integer DEFAULT 35,
  p_registro_invima text DEFAULT NULL,
  p_codigo_barras text DEFAULT NULL,
  p_requiere_esterilizacion boolean DEFAULT false
) RETURNS public.productos_terminados
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_prod public.productos_terminados%ROWTYPE; v_row jsonb;
BEGIN
  PERFORM public.validar_escritura();
  IF p_nombre IS NULL OR length(trim(p_nombre)) = 0 THEN RAISE EXCEPTION 'Nombre obligatorio'; END IF;
  IF p_unidades_por_caja IS NULL OR p_unidades_por_caja < 1 THEN RAISE EXCEPTION 'Unidades por caja >= 1'; END IF;

  IF p_es_nuevo THEN
    INSERT INTO public.productos_terminados
      (codigo_pt, nombre, categoria_id, unidades_por_caja, precio_venta,
       plantilla_etiqueta, vida_util_meses, registro_invima, codigo_barras,
       requiere_esterilizacion)
    VALUES
      (p_codigo_pt, p_nombre, p_categoria_id, p_unidades_por_caja, p_precio_venta,
       p_plantilla_etiqueta, p_vida_util_meses, p_registro_invima, p_codigo_barras,
       p_requiere_esterilizacion)
    RETURNING * INTO v_prod;
  ELSE
    UPDATE public.productos_terminados
      SET nombre = p_nombre, categoria_id = p_categoria_id,
          unidades_por_caja = p_unidades_por_caja, precio_venta = p_precio_venta,
          plantilla_etiqueta = p_plantilla_etiqueta, vida_util_meses = p_vida_util_meses,
          registro_invima = p_registro_invima, codigo_barras = p_codigo_barras,
          requiere_esterilizacion = p_requiere_esterilizacion
      WHERE codigo_pt = p_codigo_pt RETURNING * INTO v_prod;
    IF NOT FOUND THEN RAISE EXCEPTION 'PT no encontrado'; END IF;
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
END;
$$;

-- 7.3 Eliminar insumo
CREATE OR REPLACE FUNCTION public.eliminar_insumo(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_bom int; v_subre int; v_mov int;
BEGIN
  PERFORM public.validar_escritura();
  SELECT COUNT(*) INTO v_bom FROM public.bom_recetas WHERE insumo_id = p_id;
  SELECT COUNT(*) INTO v_subre FROM public.subproducto_recetas WHERE insumo_id = p_id;
  SELECT COUNT(*) INTO v_mov FROM public.movimientos WHERE insumo_id = p_id;
  IF v_bom > 0 OR v_subre > 0 THEN
    RAISE EXCEPTION 'En uso en recetas (BOM: %, subproductos: %)', v_bom, v_subre;
  END IF;
  IF v_mov > 0 THEN
    RAISE EXCEPTION 'Tiene % movimientos. Desactívalo en lugar de borrarlo.', v_mov;
  END IF;
  DELETE FROM public.insumos WHERE id = p_id;
END;
$$;

-- =============================================================
-- SECCIÓN 8 · RPCs DE PRODUCCIÓN DE SUBPRODUCTO
-- =============================================================

-- 8.1 Producir subproducto standalone
CREATE OR REPLACE FUNCTION public.producir_subproducto(
  p_id uuid, p_cantidad numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub record;
  v_receta record;
  v_hijo record;
  v_stock numeric;
  v_items int := 0;
  v_produccion_id uuid;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  SELECT * INTO v_sub FROM public.subproductos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subproducto no encontrado'; END IF;

  -- Validar stock de insumos
  FOR v_receta IN
    SELECT insumo_id, cantidad_por_unidad, factor_receta
    FROM public.subproducto_recetas WHERE subproducto_id = p_id
  LOOP
    SELECT existencia_actual INTO v_stock FROM public.insumos WHERE id = v_receta.insumo_id;
    IF v_stock < v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta,1) * p_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente de insumo';
    END IF;
  END LOOP;

  -- Crear producción
  INSERT INTO public.subproducto_producciones
    (subproducto_id, orden_id, cantidad_inicial, cantidad_actual, usuario_email)
  VALUES
    (p_id, NULL, p_cantidad, p_cantidad, public.current_user_email())
  RETURNING id INTO v_produccion_id;

  -- Consumir insumos
  FOR v_receta IN
    SELECT insumo_id, cantidad_por_unidad, factor_receta
    FROM public.subproducto_recetas WHERE subproducto_id = p_id
  LOOP
    PERFORM public.consumir_insumo_fifo(
      v_receta.insumo_id,
      v_receta.cantidad_por_unidad * COALESCE(v_receta.factor_receta,1) * p_cantidad,
      COALESCE(p_motivo, 'Producción ' || v_sub.nombre),
      NULL, 'consumo', v_produccion_id
    );
    v_items := v_items + 1;
  END LOOP;

  -- Consumir hijos recursivamente
  FOR v_hijo IN
    SELECT subproducto_hijo_id, cantidad_por_unidad
    FROM public.subproducto_subproductos WHERE subproducto_padre_id = p_id
  LOOP
    PERFORM public.consumir_subproducto_recursivo(
      v_hijo.subproducto_hijo_id,
      v_hijo.cantidad_por_unidad * p_cantidad,
      NULL, ARRAY[]::uuid[]
    );
    v_items := v_items + 1;
  END LOOP;

  -- Actualizar stock
  UPDATE public.subproductos SET existencia_actual = existencia_actual + p_cantidad WHERE id = p_id;

  -- Movimiento de producción
  INSERT INTO public.movimientos
    (tipo, cantidad, subproducto_produccion_id, observaciones)
  VALUES
    ('produccion_subproducto', p_cantidad, v_produccion_id, COALESCE(p_motivo, 'Producción'));

  RETURN jsonb_build_object(
    'existencia_nueva', v_sub.existencia_actual + p_cantidad,
    'items_afectados', v_items,
    'produccion_id', v_produccion_id
  );
END;
$$;

-- =============================================================
-- SECCIÓN 9 · RPCs DE ÓRDENES
-- =============================================================

-- 9.1 Confirmar orden
CREATE OR REPLACE FUNCTION public.confirmar_orden(
  p_codigo_pt text, p_cantidad numeric,
  p_estado_cobertura text, p_detalle jsonb,
  p_numero_op text DEFAULT NULL,
  p_lote text DEFAULT NULL,
  p_prioridad integer DEFAULT NULL,
  p_fecha_programada date DEFAULT NULL,
  p_fecha_fin_programada date DEFAULT NULL
) RETURNS public.ordenes_semanales
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_orden public.ordenes_semanales%ROWTYPE;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_lote IS NULL OR trim(p_lote) = '' THEN RAISE EXCEPTION 'Lote obligatorio'; END IF;

  INSERT INTO public.ordenes_semanales
    (codigo_pt, cantidad_proyectada, estado_cobertura, detalle_faltantes,
     numero_op, lote, prioridad, fecha_programada, fecha_fin_programada)
  VALUES
    (p_codigo_pt, p_cantidad, p_estado_cobertura, p_detalle,
     p_numero_op, trim(p_lote), p_prioridad, p_fecha_programada, p_fecha_fin_programada)
  RETURNING * INTO v_orden;
  RETURN v_orden;
END;
$$;

-- 9.2 Cancelar orden
CREATE OR REPLACE FUNCTION public.cancelar_orden(p_orden_id uuid, p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_orden record; v_lotes_en_central int;
BEGIN
  PERFORM public.validar_escritura();
  SELECT * INTO v_orden FROM public.ordenes_semanales WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;
  IF v_orden.estado_op = 'Terminada' THEN RAISE EXCEPTION 'No se puede cancelar una OP terminada'; END IF;
  IF v_orden.estado_op = 'Cancelada' THEN RAISE EXCEPTION 'Ya está cancelada'; END IF;

  SELECT COUNT(*) INTO v_lotes_en_central FROM public.lotes_pt
    WHERE orden_id = p_orden_id AND cantidad_actual > 0
      AND estado IN ('en_central','en_bodega','en_reproceso');
  IF v_lotes_en_central > 0 THEN
    RAISE EXCEPTION 'Hay unidades ya procesadas. Resolvé primero las cargas EO.';
  END IF;

  -- Cancelar lotes en planta
  UPDATE public.lotes_pt SET estado = 'rechazado', cantidad_actual = 0
    WHERE orden_id = p_orden_id AND estado = 'en_planta';

  UPDATE public.ordenes_semanales
    SET estado_op = 'Cancelada', fecha_cancelado = now(), motivo_cancelacion = p_motivo
    WHERE id = p_orden_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 9.3 Registrar entrega parcial o total
CREATE OR REPLACE FUNCTION public.registrar_entrega_op(
  p_orden_id uuid, p_cantidad numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_op record;
  v_pt record;
  v_pendiente numeric;
  v_producido_antes numeric;
  v_insumo_req jsonb;
  v_key text;
  v_cant_req numeric;
  v_stock numeric;
  v_faltantes jsonb := '[]'::jsonb;
  v_insumo record;
  v_sub record;
  v_lote_pt_id uuid;
  v_estado_lote text;
  v_items int := 0;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;

  SELECT * INTO v_op FROM public.ordenes_semanales WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OP no encontrada'; END IF;
  IF v_op.estado_op IN ('Terminada','Cancelada') THEN
    RAISE EXCEPTION 'La OP ya está cerrada o cancelada';
  END IF;

  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = v_op.codigo_pt;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT no encontrado: %', v_op.codigo_pt; END IF;

  v_producido_antes := v_op.cantidad_producida;
  v_pendiente := v_op.cantidad_proyectada - v_producido_antes;
  IF p_cantidad > v_pendiente THEN
    RAISE EXCEPTION 'La cantidad excede el pendiente. Pendiente: %', v_pendiente;
  END IF;

  -- Validación previa de stock
  v_insumo_req := public.simular_consumo_pt(v_op.codigo_pt, p_cantidad)->'insumo_req';
  FOR v_key IN SELECT jsonb_object_keys(v_insumo_req) LOOP
    v_cant_req := (v_insumo_req->>v_key)::numeric;
    SELECT * INTO v_insumo FROM public.insumos WHERE id = v_key::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo % no encontrado', v_key; END IF;
    IF v_insumo.existencia_actual < v_cant_req THEN
      v_faltantes := v_faltantes || jsonb_build_object(
        'tipo','insumo','insumo_id',v_key,'nombre',v_insumo.nombre,
        'requerido',v_cant_req,'existencia',v_insumo.existencia_actual
      );
    END IF;
  END LOOP;
  IF jsonb_array_length(v_faltantes) > 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: %', v_faltantes::text;
  END IF;

  -- Consumir subproductos
  FOR v_sub IN
    SELECT subproducto_id, cantidad FROM public.paquete_subproductos WHERE codigo_pt = v_op.codigo_pt
  LOOP
    PERFORM public.consumir_subproducto_recursivo(
      v_sub.subproducto_id, v_sub.cantidad * p_cantidad, p_orden_id, ARRAY[]::uuid[]
    );
    v_items := v_items + 1;
  END LOOP;

  -- Consumir insumos directos
  FOR v_insumo IN
    SELECT insumo_id, cantidad_por_unidad FROM public.bom_recetas WHERE codigo_pt = v_op.codigo_pt
  LOOP
    PERFORM public.consumir_insumo_fifo(
      v_insumo.insumo_id, v_insumo.cantidad_por_unidad * p_cantidad,
      'Consumo OP ' || COALESCE(v_op.numero_op, ''), p_orden_id, 'consumo', NULL
    );
    v_items := v_items + 1;
  END LOOP;

  -- Registrar entrega
  INSERT INTO public.entregas_op (orden_id, cantidad, motivo, usuario_email)
  VALUES (p_orden_id, p_cantidad, p_motivo, public.current_user_email());

  -- Crear/actualizar lotes_pt
  IF v_pt.requiere_esterilizacion THEN
    v_estado_lote := 'en_planta';
  ELSE
    v_estado_lote := 'en_bodega';
  END IF;

  SELECT id INTO v_lote_pt_id FROM public.lotes_pt
    WHERE codigo_pt = v_op.codigo_pt AND lote_op = v_op.lote
      AND lote_eo IS NULL AND estado = v_estado_lote
    FOR UPDATE;

  IF v_lote_pt_id IS NOT NULL THEN
    UPDATE public.lotes_pt
      SET cantidad_inicial = cantidad_inicial + p_cantidad,
          cantidad_actual = cantidad_actual + p_cantidad
      WHERE id = v_lote_pt_id;
  ELSE
    INSERT INTO public.lotes_pt
      (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado)
    VALUES
      (v_op.codigo_pt, v_op.lote, NULL, v_op.id, p_cantidad, p_cantidad, v_estado_lote)
    RETURNING id INTO v_lote_pt_id;
  END IF;

  -- Si PT no estéril, sumar stock
  IF NOT v_pt.requiere_esterilizacion THEN
    UPDATE public.productos_terminados
      SET existencia_actual = existencia_actual + p_cantidad
      WHERE codigo_pt = v_op.codigo_pt;
  END IF;

  -- Movimiento de producción PT
  INSERT INTO public.movimientos
    (tipo, cantidad, lote_pt_id, orden_id, observaciones)
  VALUES
    ('produccion_pt', p_cantidad, v_lote_pt_id, v_op.id, 'Entrega de OP');

  -- Actualizar orden
  UPDATE public.ordenes_semanales
    SET cantidad_producida = v_producido_antes + p_cantidad,
        estado_op = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada
                         THEN 'Terminada' ELSE 'En proceso' END,
        fecha_completado = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada
                                THEN now() ELSE NULL END
    WHERE id = p_orden_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cantidad_entregada', p_cantidad,
    'cantidad_producida', v_producido_antes + p_cantidad,
    'cantidad_pendiente', v_pendiente - p_cantidad,
    'op_cerrada', (v_producido_antes + p_cantidad) >= v_op.cantidad_proyectada,
    'items_afectados', v_items,
    'lote_pt_id', v_lote_pt_id,
    'estado_lote', v_estado_lote
  );
END;
$$;

-- 9.4 Recalcular cobertura (solo lectura)
CREATE OR REPLACE FUNCTION public.recalcular_cobertura_op(p_orden_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_op record;
  v_simulacion jsonb;
  v_faltantes jsonb := '[]'::jsonb;
  v_peor text := 'Cubierto';
  v_ins_key text;
  v_ins record;
  v_requerido numeric;
  v_pendiente numeric;
BEGIN
  SELECT * INTO v_op FROM public.ordenes_semanales WHERE id = p_orden_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OP no encontrada'; END IF;
  v_pendiente := v_op.cantidad_proyectada - v_op.cantidad_producida;
  IF v_pendiente <= 0 THEN
    RETURN jsonb_build_object('estado_general','Terminada','faltantes','[]'::jsonb);
  END IF;
  v_simulacion := public.simular_consumo_pt(v_op.codigo_pt, v_pendiente);
  FOR v_ins_key IN SELECT jsonb_object_keys(v_simulacion->'insumo_req') LOOP
    v_requerido := (v_simulacion->'insumo_req'->>v_ins_key)::numeric;
    SELECT * INTO v_ins FROM public.insumos WHERE id = v_ins_key::uuid;
    IF FOUND AND v_ins.existencia_actual < v_requerido THEN
      v_faltantes := v_faltantes || jsonb_build_object(
        'tipo','insumo','insumo_id',v_ins_key,
        'nombre',v_ins.nombre,'requerido',v_requerido,'existencia',v_ins.existencia_actual
      );
      v_peor := 'Urgente';
    END IF;
  END LOOP;
  RETURN jsonb_build_object('estado_general', v_peor, 'faltantes', v_faltantes, 'pendiente', v_pendiente);
END;
$$;

-- =============================================================
-- SECCIÓN 10 · RPCs DE ESTERILIZACIÓN
-- =============================================================

-- 10.1 Crear carga EO (envío a central)
CREATE OR REPLACE FUNCTION public.crear_carga_eo(
  p_numero_carga text, p_items jsonb, p_observaciones text DEFAULT NULL
) RETURNS public.cargas_eo
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_carga public.cargas_eo%ROWTYPE;
  v_item jsonb;
  v_orden_id uuid;
  v_cantidad numeric;
  v_lote_pt record;
  v_lote_pt_id uuid;
BEGIN
  PERFORM public.validar_escritura();
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe enviar al menos un item';
  END IF;

  INSERT INTO public.cargas_eo (numero_carga, observaciones, usuario_envio_email)
  VALUES (p_numero_carga, p_observaciones, public.current_user_email())
  RETURNING * INTO v_carga;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_orden_id := (v_item->>'orden_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;

    -- Buscar lote en_planta
    SELECT * INTO v_lote_pt FROM public.lotes_pt
      WHERE orden_id = v_orden_id AND estado = 'en_planta' AND cantidad_actual >= v_cantidad
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No hay % unidades en planta para la orden %', v_cantidad, v_orden_id;
    END IF;

    -- Reducir en_planta
    UPDATE public.lotes_pt SET cantidad_actual = cantidad_actual - v_cantidad
      WHERE id = v_lote_pt.id;

    -- Crear/actualizar en_central
    SELECT id INTO v_lote_pt_id FROM public.lotes_pt
      WHERE orden_id = v_orden_id AND estado = 'en_central' AND lote_eo IS NULL
      FOR UPDATE;
    IF v_lote_pt_id IS NOT NULL THEN
      UPDATE public.lotes_pt
        SET cantidad_inicial = cantidad_inicial + v_cantidad,
            cantidad_actual = cantidad_actual + v_cantidad
        WHERE id = v_lote_pt_id;
    ELSE
      INSERT INTO public.lotes_pt
        (codigo_pt, lote_op, lote_eo, orden_id, carga_eo_id, cantidad_inicial, cantidad_actual, estado)
      VALUES
        (v_lote_pt.codigo_pt, v_lote_pt.lote_op, NULL, v_orden_id, v_carga.id,
         v_cantidad, v_cantidad, 'en_central')
      RETURNING id INTO v_lote_pt_id;
    END IF;

    INSERT INTO public.movimientos
      (tipo, cantidad, lote_pt_id, orden_id, carga_eo_id, observaciones, usuario_email)
    VALUES
      ('envio_central', v_cantidad, v_lote_pt_id, v_orden_id, v_carga.id,
       'Envío a central', public.current_user_email());

    INSERT INTO public.carga_eo_items (carga_id, orden_id, cantidad_enviada)
    VALUES (v_carga.id, v_orden_id, v_cantidad);
  END LOOP;

  RETURN v_carga;
END;
$$;

-- 10.2 Recibir carga EO
CREATE OR REPLACE FUNCTION public.recibir_carga_eo(
  p_carga_id uuid, p_items jsonb, p_observaciones text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_carga record;
  v_item jsonb;
  v_carga_item record;
  v_orden_id uuid;
  v_recibida numeric;
  v_rechazada numeric;
  v_motivo text;
  v_total_recibido numeric := 0;
  v_total_rechazado numeric := 0;
  v_lote_pt record;
  v_lote_pt_id uuid;
  v_nuevo_estado text;
BEGIN
  PERFORM public.validar_escritura();
  SELECT * INTO v_carga FROM public.cargas_eo WHERE id = p_carga_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carga no encontrada'; END IF;
  IF v_carga.estado <> 'enviada' THEN
    RAISE EXCEPTION 'La carga ya fue procesada (estado: %)', v_carga.estado;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_orden_id := (v_item->>'orden_id')::uuid;
    v_recibida := COALESCE((v_item->>'cantidad_recibida')::numeric, 0);
    v_rechazada := COALESCE((v_item->>'cantidad_rechazada')::numeric, 0);
    v_motivo := v_item->>'motivo_rechazo';

    SELECT * INTO v_carga_item FROM public.carga_eo_items
      WHERE carga_id = p_carga_id AND orden_id = v_orden_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item no encontrado en carga'; END IF;
    IF (v_recibida + v_rechazada) <> v_carga_item.cantidad_enviada THEN
      RAISE EXCEPTION 'Recibida + rechazada debe sumar la cantidad enviada (%)', v_carga_item.cantidad_enviada;
    END IF;

    UPDATE public.carga_eo_items
      SET cantidad_recibida = v_recibida,
          cantidad_rechazada = v_rechazada,
          motivo_rechazo = v_motivo
      WHERE id = v_carga_item.id;

    -- Mover en_central → en_bodega (recibidas)
    SELECT * INTO v_lote_pt FROM public.lotes_pt
      WHERE orden_id = v_orden_id AND estado = 'en_central' AND cantidad_actual >= v_carga_item.cantidad_enviada
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No hay unidades en central para la orden %', v_orden_id; END IF;

    UPDATE public.lotes_pt SET cantidad_actual = cantidad_actual - v_carga_item.cantidad_enviada
      WHERE id = v_lote_pt.id;

    IF v_recibida > 0 THEN
      SELECT id INTO v_lote_pt_id FROM public.lotes_pt
        WHERE codigo_pt = v_lote_pt.codigo_pt AND lote_op = v_lote_pt.lote_op
          AND lote_eo = v_carga.numero_carga AND estado = 'en_bodega'
        FOR UPDATE;
      IF v_lote_pt_id IS NOT NULL THEN
        UPDATE public.lotes_pt
          SET cantidad_inicial = cantidad_inicial + v_recibida,
              cantidad_actual = cantidad_actual + v_recibida
          WHERE id = v_lote_pt_id;
      ELSE
        INSERT INTO public.lotes_pt
          (codigo_pt, lote_op, lote_eo, orden_id, carga_eo_id, cantidad_inicial, cantidad_actual,
           estado, fecha_esterilizacion)
        VALUES
          (v_lote_pt.codigo_pt, v_lote_pt.lote_op, v_carga.numero_carga, v_orden_id, p_carga_id,
           v_recibida, v_recibida, 'en_bodega', now())
        RETURNING id INTO v_lote_pt_id;
      END IF;

      UPDATE public.productos_terminados
        SET existencia_actual = existencia_actual + v_recibida
        WHERE codigo_pt = v_lote_pt.codigo_pt;

      INSERT INTO public.movimientos
        (tipo, cantidad, lote_pt_id, orden_id, carga_eo_id, observaciones, usuario_email)
      VALUES
        ('recepcion_central', v_recibida, v_lote_pt_id, v_orden_id, p_carga_id,
         'Recepción de central', public.current_user_email());
      v_total_recibido := v_total_recibido + v_recibida;
    END IF;

    IF v_rechazada > 0 THEN
      SELECT id INTO v_lote_pt_id FROM public.lotes_pt
        WHERE orden_id = v_orden_id AND estado = 'en_reproceso' AND lote_eo IS NULL
        FOR UPDATE;
      IF v_lote_pt_id IS NOT NULL THEN
        UPDATE public.lotes_pt
          SET cantidad_inicial = cantidad_inicial + v_rechazada,
              cantidad_actual = cantidad_actual + v_rechazada
          WHERE id = v_lote_pt_id;
      ELSE
        INSERT INTO public.lotes_pt
          (codigo_pt, lote_op, lote_eo, orden_id, carga_eo_id, cantidad_inicial, cantidad_actual, estado)
        VALUES
          (v_lote_pt.codigo_pt, v_lote_pt.lote_op, NULL, v_orden_id, p_carga_id,
           v_rechazada, v_rechazada, 'en_reproceso')
        RETURNING id INTO v_lote_pt_id;
      END IF;

      INSERT INTO public.movimientos
        (tipo, cantidad, lote_pt_id, orden_id, carga_eo_id, observaciones, usuario_email)
      VALUES
        ('recepcion_central', v_rechazada, v_lote_pt_id, v_orden_id, p_carga_id,
         'Rechazo: ' || COALESCE(v_motivo, 'sin motivo'), public.current_user_email());
      v_total_rechazado := v_total_rechazado + v_rechazada;
    END IF;
  END LOOP;

  v_nuevo_estado := CASE
    WHEN v_total_rechazado = 0 THEN 'recibida'
    WHEN v_total_recibido = 0 THEN 'rechazada_total'
    ELSE 'rechazada_parcial'
  END;

  UPDATE public.cargas_eo
    SET estado = v_nuevo_estado, fecha_recepcion = now(),
        observaciones = COALESCE(observaciones, '') ||
          CASE WHEN p_observaciones IS NOT NULL THEN E'\n' || p_observaciones ELSE '' END,
        usuario_recepcion_email = public.current_user_email()
    WHERE id = p_carga_id;

  RETURN jsonb_build_object(
    'estado', v_nuevo_estado,
    'total_recibido', v_total_recibido,
    'total_rechazado', v_total_rechazado
  );
END;
$$;

-- =============================================================
-- SECCIÓN 11 · RPCs DE DESPACHOS Y DEVOLUCIONES
-- =============================================================

-- 11.1 Registrar despacho
CREATE OR REPLACE FUNCTION public.registrar_despacho(
  p_codigo_pt text, p_cantidad numeric, p_cliente text,
  p_lote_op text, p_lote_eo text DEFAULT NULL,
  p_consecutivo text DEFAULT NULL, p_oc text DEFAULT NULL,
  p_fecha date DEFAULT CURRENT_DATE,
  p_fecha_vencimiento text DEFAULT NULL, p_observaciones text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_pt record;
  v_lote_pt record;
  v_existencia_nueva numeric;
  v_despacho_id uuid;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_cliente IS NULL OR length(trim(p_cliente)) = 0 THEN RAISE EXCEPTION 'Cliente obligatorio'; END IF;

  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = p_codigo_pt FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT no encontrado'; END IF;
  IF v_pt.requiere_esterilizacion AND (p_lote_eo IS NULL OR trim(p_lote_eo) = '') THEN
    RAISE EXCEPTION 'El PT es estéril y requiere Lote EO';
  END IF;

  SELECT * INTO v_lote_pt FROM public.lotes_pt
    WHERE codigo_pt = p_codigo_pt AND lote_op = p_lote_op
      AND estado = 'en_bodega' AND cantidad_actual >= p_cantidad
      AND (p_lote_eo IS NULL OR lote_eo = p_lote_eo)
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente en lotes_pt (lote_op=%, lote_eo=%)', p_lote_op, p_lote_eo;
  END IF;

  UPDATE public.lotes_pt SET cantidad_actual = cantidad_actual - p_cantidad
    WHERE id = v_lote_pt.id;

  UPDATE public.productos_terminados
    SET existencia_actual = existencia_actual - p_cantidad
    WHERE codigo_pt = p_codigo_pt
    RETURNING existencia_actual INTO v_existencia_nueva;

  INSERT INTO public.despachos
    (codigo_pt, lote_op, lote_eo, cantidad, cliente, consecutivo, oc,
     fecha, fecha_vencimiento, observaciones, usuario_email)
  VALUES
    (p_codigo_pt, p_lote_op, p_lote_eo, p_cantidad, p_cliente, p_consecutivo, p_oc,
     p_fecha, p_fecha_vencimiento, p_observaciones, public.current_user_email())
  RETURNING id INTO v_despacho_id;

  INSERT INTO public.movimientos
    (tipo, cantidad, lote_pt_id, despacho_id, observaciones, usuario_email)
  VALUES
    ('despacho', p_cantidad, v_lote_pt.id, v_despacho_id,
     'Despacho a ' || p_cliente, public.current_user_email());

  RETURN jsonb_build_object(
    'ok', true,
    'existencia_nueva', v_existencia_nueva,
    'lote_pt_id', v_lote_pt.id
  );
END;
$$;

-- 11.2 Registrar devolución de PT
CREATE OR REPLACE FUNCTION public.registrar_devolucion_pt(
  p_codigo_pt text, p_cantidad numeric,
  p_estado_producto text DEFAULT 'bueno',
  p_motivo text DEFAULT NULL,
  p_lote_op text DEFAULT NULL, p_lote_eo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_pt record;
  v_devolucion_id uuid;
  v_lote_pt_id uuid;
  v_existencia numeric;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_estado_producto NOT IN ('bueno','cuarentena','dañado') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = p_codigo_pt FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT no encontrado'; END IF;

  IF p_estado_producto = 'bueno' AND p_lote_op IS NOT NULL THEN
    -- Buscar/crear lote_pt en bodega
    SELECT id INTO v_lote_pt_id FROM public.lotes_pt
      WHERE codigo_pt = p_codigo_pt AND lote_op = p_lote_op
        AND lote_eo IS NOT DISTINCT FROM p_lote_eo AND estado = 'en_bodega'
      FOR UPDATE;
    IF v_lote_pt_id IS NOT NULL THEN
      UPDATE public.lotes_pt
        SET cantidad_inicial = cantidad_inicial + p_cantidad,
            cantidad_actual = cantidad_actual + p_cantidad
        WHERE id = v_lote_pt_id;
    ELSE
      INSERT INTO public.lotes_pt
        (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado)
      SELECT p_codigo_pt, p_lote_op, p_lote_eo, id, p_cantidad, p_cantidad, 'en_bodega'
      FROM public.ordenes_semanales WHERE codigo_pt = p_codigo_pt AND lote = p_lote_op
      LIMIT 1
      RETURNING id INTO v_lote_pt_id;
    END IF;

    UPDATE public.productos_terminados
      SET existencia_actual = existencia_actual + p_cantidad
      WHERE codigo_pt = p_codigo_pt;
  END IF;

  INSERT INTO public.devoluciones_pt
    (codigo_pt, lote_op, lote_eo, cantidad, estado_producto, motivo, usuario_email)
  VALUES
    (p_codigo_pt, p_lote_op, p_lote_eo, p_cantidad, p_estado_producto, p_motivo, public.current_user_email())
  RETURNING id INTO v_devolucion_id;

  SELECT existencia_actual INTO v_existencia FROM public.productos_terminados WHERE codigo_pt = p_codigo_pt;

  RETURN jsonb_build_object(
    'existencia_nueva', v_existencia,
    'afecta_stock', p_estado_producto = 'bueno'
  );
END;
$$;

-- =============================================================
-- SECCIÓN 12 · RPCs DE TRAZABILIDAD
-- =============================================================

-- 12.1 Trazabilidad forward (PT → insumos con lotes)
CREATE OR REPLACE FUNCTION public.trazar_forward(
  p_codigo_pt text, p_lote_op text, p_lote_eo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_orden record;
  v_movs jsonb;
  v_insumos jsonb;
  v_subs jsonb;
BEGIN
  SELECT * INTO v_orden FROM public.ordenes_semanales
    WHERE codigo_pt = p_codigo_pt AND lote = p_lote_op
    ORDER BY fecha_creacion DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'OP no encontrada para el lote indicado');
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'lote_id', il.id,
    'lote', il.lote,
    'insumo_nombre', i.nombre,
    'insumo_codigo', i.codigo,
    'cantidad', m.cantidad,
    'proveedor', pr.razon_social
  ))
  INTO v_insumos
  FROM public.movimientos m
  JOIN public.insumos i ON i.id = m.insumo_id
  LEFT JOIN public.insumo_lotes il ON il.id = m.insumo_lote_id
  LEFT JOIN public.sys_proveedores pr ON pr.id = il.proveedor_id
  WHERE m.orden_id = v_orden.id AND m.tipo = 'consumo';

  SELECT jsonb_agg(jsonb_build_object(
    'produccion_id', sp.id,
    'subproducto_nombre', s.nombre,
    'subproducto_codigo', s.codigo,
    'cantidad', m.cantidad,
    'auto_producido', m.parent_subproducto_produccion_id IS NOT NULL
  ))
  INTO v_subs
  FROM public.movimientos m
  JOIN public.subproducto_producciones sp ON sp.id = m.subproducto_produccion_id
  JOIN public.subproductos s ON s.id = sp.subproducto_id
  WHERE m.orden_id = v_orden.id AND m.tipo = 'consumo_subproducto';

  RETURN jsonb_build_object(
    'orden_id', v_orden.id,
    'lote_op', p_lote_op,
    'lote_eo', p_lote_eo,
    'insumos', COALESCE(v_insumos, '[]'::jsonb),
    'subproductos', COALESCE(v_subs, '[]'::jsonb)
  );
END;
$$;

-- 12.2 Trazabilidad backward (insumo → PTs)
CREATE OR REPLACE FUNCTION public.trazar_backward(p_insumo_id uuid, p_lote text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_lote_id uuid;
  v_ops jsonb;
BEGIN
  SELECT id INTO v_lote_id FROM public.insumo_lotes
    WHERE insumo_id = p_insumo_id AND lote = p_lote;
  IF v_lote_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Lote no encontrado');
  END IF;

  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'orden_id', o.id,
    'codigo_pt', o.codigo_pt,
    'numero_op', o.numero_op,
    'lote_op', o.lote,
    'lote_eo', lp.lote_eo,
    'estado_lote', lp.estado
  ))
  INTO v_ops
  FROM public.movimientos m
  JOIN public.ordenes_semanales o ON o.id = m.orden_id
  LEFT JOIN public.lotes_pt lp ON lp.orden_id = o.id AND lp.cantidad_inicial > 0
  WHERE m.insumo_lote_id = v_lote_id AND m.tipo = 'consumo' AND m.orden_id IS NOT NULL;

  RETURN jsonb_build_object(
    'insumo_id', p_insumo_id,
    'lote', p_lote,
    'ops_afectadas', COALESCE(v_ops, '[]'::jsonb)
  );
END;
$$;

-- =============================================================
-- SECCIÓN 13 · RPCs DE CAJAS
-- =============================================================

-- 13.1 Reservar cajas (con lote)
CREATE OR REPLACE FUNCTION public.reservar_cajas_lote(
  p_codigo_pt text, p_lote text, p_cantidad int
) RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio int;
  v_codigos text[] := ARRAY[]::text[];
  v_i int;
  v_cod text;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad debe ser > 0'; END IF;
  IF p_lote IS NULL OR length(trim(p_lote)) = 0 THEN
    RAISE EXCEPTION 'El lote es obligatorio para generar códigos de caja';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_codigo_pt || ':' || p_lote));
  v_inicio := public.siguiente_codigo_caja(p_codigo_pt, p_lote);

  FOR v_i IN 0..(p_cantidad - 1) LOOP
    v_cod := p_codigo_pt || '-C' || lpad((v_inicio + v_i)::text, 3, '0')
             || '-LOTE-' || p_lote;
    v_codigos := array_append(v_codigos, v_cod);
    INSERT INTO public.cajas_ubicacion
      (codigo_caja, codigo_pt, ubicacion, estado, usuario_email)
    VALUES
      (v_cod, p_codigo_pt, 'Pendiente de ubicar', 'Impresa', public.current_user_email())
    ON CONFLICT (codigo_caja) DO NOTHING;
  END LOOP;

  RETURN v_codigos;
END;
$$;

-- =============================================================
-- FIN PARTE 2
--
-- Siguiente: Parte 3/3
--   · Corrección del UNIQUE de lotes_pt (índice funcional)
--   · Triggers (handle_new_user, sys_config_meta)
--   · RLS (todas las tablas, con políticas de lectura/escritura)
--   · Revokes (funciones internas)
--   · system_health_check()
--   · Seed (categorías)
--   · Comentarios finales
-- =============================================================

-- =============================================================
-- SECCIÓN 14 · FIXES
-- =============================================================

-- 14.1 Corregir UNIQUE de lotes_pt (NULL handling)
-- PostgreSQL trata NULL como distinto en UNIQUE, así que un índice
-- funcional con COALESCE es la forma correcta.
ALTER TABLE public.lotes_pt DROP CONSTRAINT IF EXISTS lotes_pt_codigo_pt_lote_op_lote_eo_estado_key;
DROP INDEX IF EXISTS public.lotes_pt_unique_idx;
CREATE UNIQUE INDEX lotes_pt_unique_idx ON public.lotes_pt
  (codigo_pt, lote_op, COALESCE(lote_eo, '∅'), estado);

-- 14.2 Reemplazar crear_carga_eo (soporta origen en_planta y en_reproceso)
DROP FUNCTION IF EXISTS public.crear_carga_eo(text, jsonb, text);
CREATE OR REPLACE FUNCTION public.crear_carga_eo(
  p_numero_carga text, p_items jsonb, p_observaciones text DEFAULT NULL
) RETURNS public.cargas_eo
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_carga public.cargas_eo%ROWTYPE;
  v_item jsonb;
  v_orden_id uuid;
  v_cantidad numeric;
  v_origen text;
  v_lote_pt record;
  v_lote_pt_id uuid;
BEGIN
  PERFORM public.validar_escritura();
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe enviar al menos un item';
  END IF;

  INSERT INTO public.cargas_eo (numero_carga, observaciones, usuario_envio_email)
  VALUES (p_numero_carga, p_observaciones, public.current_user_email())
  RETURNING * INTO v_carga;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_orden_id := (v_item->>'orden_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_origen := COALESCE(v_item->>'origen', 'en_planta');

    IF v_origen NOT IN ('en_planta','en_reproceso') THEN
      RAISE EXCEPTION 'Origen inválido: % (debe ser en_planta o en_reproceso)', v_origen;
    END IF;

    SELECT * INTO v_lote_pt FROM public.lotes_pt
      WHERE orden_id = v_orden_id AND estado = v_origen AND cantidad_actual >= v_cantidad
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No hay % unidades en % para la orden %', v_cantidad, v_origen, v_orden_id;
    END IF;

    UPDATE public.lotes_pt SET cantidad_actual = cantidad_actual - v_cantidad
      WHERE id = v_lote_pt.id;

    SELECT id INTO v_lote_pt_id FROM public.lotes_pt
      WHERE orden_id = v_orden_id AND estado = 'en_central' AND lote_eo IS NULL
      FOR UPDATE;
    IF v_lote_pt_id IS NOT NULL THEN
      UPDATE public.lotes_pt
        SET cantidad_inicial = cantidad_inicial + v_cantidad,
            cantidad_actual = cantidad_actual + v_cantidad
        WHERE id = v_lote_pt_id;
    ELSE
      INSERT INTO public.lotes_pt
        (codigo_pt, lote_op, lote_eo, orden_id, carga_eo_id, cantidad_inicial, cantidad_actual, estado)
      VALUES
        (v_lote_pt.codigo_pt, v_lote_pt.lote_op, NULL, v_orden_id, v_carga.id,
         v_cantidad, v_cantidad, 'en_central')
      RETURNING id INTO v_lote_pt_id;
    END IF;

    INSERT INTO public.movimientos
      (tipo, cantidad, lote_pt_id, orden_id, carga_eo_id, observaciones, usuario_email)
    VALUES
      ('envio_central', v_cantidad, v_lote_pt_id, v_orden_id, v_carga.id,
       'Envío a central (' || v_origen || ')', public.current_user_email());

    INSERT INTO public.carga_eo_items (carga_id, orden_id, cantidad_enviada)
    VALUES (v_carga.id, v_orden_id, v_cantidad);
  END LOOP;

  RETURN v_carga;
END;
$$;

-- =============================================================
-- SECCIÓN 15 · TRIGGERS
-- =============================================================

-- 15.1 Crear profile al crear usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
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
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15.2 Metadata en update de sys_config
CREATE OR REPLACE FUNCTION public.sys_config_actualizar_meta()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.actualizado_en := now();
  NEW.actualizado_por_email := public.current_user_email();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sys_config_meta ON public.sys_config;
CREATE TRIGGER sys_config_meta
  BEFORE UPDATE ON public.sys_config
  FOR EACH ROW EXECUTE FUNCTION public.sys_config_actualizar_meta();

-- =============================================================
-- SECCIÓN 16 · RLS
-- =============================================================

-- 16.1 Habilitar RLS en las 26 tablas
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subproductos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_terminados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subproducto_recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subproducto_subproductos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paquete_subproductos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_op ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subproducto_producciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_eo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carga_eo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumo_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_pt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones_pt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas_ubicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etiquetas_impresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 16.2 SELECT para todos los roles válidos (24 tablas)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categorias','insumos','subproductos','productos_terminados',
    'sys_proveedores','bom_recetas','subproducto_recetas',
    'subproducto_subproductos','paquete_subproductos',
    'ordenes_semanales','entregas_op','subproducto_producciones',
    'cargas_eo','carga_eo_items','insumo_lotes','lotes_pt',
    'movimientos','despachos','devoluciones_pt',
    'evaluaciones_proveedores','cajas_ubicacion','etiquetas_impresas',
    'backup_log','sys_config'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated '
      'USING (public.current_user_role() IN (''admin'',''operador'',''consulta''))',
      t, t
    );
  END LOOP;
END $$;

-- 16.3 Escritura directa: catálogo
CREATE POLICY categorias_write ON public.categorias FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','operador'))
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

CREATE POLICY insumos_write ON public.insumos FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','operador'))
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

CREATE POLICY sys_proveedores_write ON public.sys_proveedores FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','operador'))
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

-- 16.4 Soft-delete: UPDATE only (sin INSERT/DELETE directo)
CREATE POLICY subproductos_update ON public.subproductos FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin','operador'))
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

CREATE POLICY productos_terminados_update ON public.productos_terminados FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin','operador'))
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

-- 16.5 Escritura directa: casos especiales
CREATE POLICY evaluaciones_proveedores_write ON public.evaluaciones_proveedores FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','operador'))
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

CREATE POLICY etiquetas_impresas_insert ON public.etiquetas_impresas FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

CREATE POLICY backup_log_insert ON public.backup_log FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY cajas_ubicacion_write ON public.cajas_ubicacion FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','operador'))
  WITH CHECK (public.current_user_role() IN ('admin','operador'));

CREATE POLICY sys_config_write ON public.sys_config FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- 16.6 profiles (lectura propia o admin, escritura admin)
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin','operador','consulta')
    AND (user_id = auth.uid() OR public.current_user_role() = 'admin')
  );

CREATE POLICY profiles_write ON public.profiles FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- 16.7 user_preferences (cada usuario la suya)
CREATE POLICY user_preferences_own ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================
-- SECCIÓN 17 · HEALTH CHECK
-- =============================================================

CREATE OR REPLACE FUNCTION public.system_health_check()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_funcs_sin_search_path jsonb;
  v_funcs_anon jsonb;
  v_tablas_sin_rls jsonb;
BEGIN
  -- Permitir la ejecución desde el SQL Editor (postgres) o desde un admin en la app
  IF public.current_user_role() <> 'admin' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede ejecutar esta función';
  END IF;

  SELECT COALESCE(jsonb_agg(p.proname), '[]'::jsonb) INTO v_funcs_sin_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
    ));

  SELECT COALESCE(jsonb_agg(p.proname), '[]'::jsonb) INTO v_funcs_anon
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  SELECT COALESCE(jsonb_agg(c.relname), '[]'::jsonb) INTO v_tablas_sin_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  RETURN jsonb_build_object(
    'ok', (
      jsonb_array_length(v_funcs_sin_search_path) = 0
      AND jsonb_array_length(v_funcs_anon) = 0
      AND jsonb_array_length(v_tablas_sin_rls) = 0
    ),
    'security_definer_sin_search_path', v_funcs_sin_search_path,
    'funciones_expuestas_a_anon', v_funcs_anon,
    'tablas_sin_rls', v_tablas_sin_rls,
    'timestamp', now()
  );
END;
$$;

-- =============================================================
-- SECCIÓN 18 · REVOKES
-- =============================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- Funciones internas: NO invocables desde authenticated
REVOKE EXECUTE ON FUNCTION public.consumir_insumo_fifo(uuid, numeric, text, uuid, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.consumir_subproducto_recursivo(uuid, numeric, uuid, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.simular_consumo_subproducto(uuid, numeric, jsonb, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.subproducto_costo(uuid, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.paquete_costo(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_caja(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sys_config_actualizar_meta() FROM authenticated;

-- Funciones públicas (garantizar EXECUTE)
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_escritura() TO authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.costos_todos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.simular_consumo_pt(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.system_health_check() TO authenticated;



-- =============================================================
-- SECCIÓN 19 · SEED
-- =============================================================

-- 19.1 Categorías base
INSERT INTO public.categorias (item_tipo, nombre, orden) VALUES
  ('insumo', 'Papelería', 1),
  ('insumo', 'Materia prima', 2),
  ('insumo', 'Otros insumos', 3),
  ('subproducto', 'Producto en proceso', 1),
  ('producto_terminado', 'Producto terminado', 1)
ON CONFLICT (item_tipo, nombre) DO NOTHING;

-- 19.2 Configuración inicial (camelCase para match con el front)
INSERT INTO public.sys_config (id, config) VALUES (1, '{
  "prefijoInsumo": "INS-",
  "prefijoSubproducto": "SUB-",
  "prefijoProducto": "PT-",
  "prefijoOP": "OP-",
  "umbralUrgente": 30,
  "umbralReorden": 60,
  "sidebar_behavior": "click",
  "unidades": ["u","m","kg","l","caja","rollo","m²"]
}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- 19.3 Backfill de profiles para usuarios existentes (si los hay)
INSERT INTO public.profiles (user_id, email, nombre, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'nombre', email), 'consulta'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================
-- POST-SETUP
-- =============================================================
--  1. Authentication → Users → Add user (marcar "Auto Confirm User").
--  2. Promover a admin:
--       UPDATE public.profiles SET role = 'admin' WHERE email = 'tu@email.com';
--  3. Verificar integridad:
--       SELECT public.system_health_check();
--     Debe devolver: {"ok": true, ...}
-- =============================================================
-- FIN DEL SCHEMA v1.0.0
-- =============================================================