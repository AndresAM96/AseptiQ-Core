-- 1. Corregir Trazabilidad Forward
CREATE OR REPLACE FUNCTION public.trazar_forward(
  p_codigo_pt text, p_lote_op text, p_lote_eo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_orden record;
  v_insumos jsonb;
  v_subs jsonb;
BEGIN
  -- CORRECCIÓN: Buscar por numero_op en lugar de lote
  SELECT * INTO v_orden FROM public.ordenes_semanales
    WHERE codigo_pt = p_codigo_pt AND numero_op = p_lote_op
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

-- 2. Corregir Trazabilidad Backward
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
    'lote_op', o.numero_op, -- CORRECCIÓN: lote_op es igual a numero_op
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

GRANT INSERT ON public.backup_log TO authenticated;