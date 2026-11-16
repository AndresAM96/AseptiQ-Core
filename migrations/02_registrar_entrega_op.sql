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
  v_fecha_vencimiento date;
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

  -- CALCULAR FECHA DE VENCIMIENTO
  v_fecha_vencimiento := (now() + (v_pt.vida_util_meses || ' months')::interval - interval '1 day')::date;

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
      (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado, fecha_produccion, fecha_vencimiento)
    VALUES
      (v_op.codigo_pt, v_op.lote, NULL, v_op.id, p_cantidad, p_cantidad, v_estado_lote, now(), v_fecha_vencimiento)
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