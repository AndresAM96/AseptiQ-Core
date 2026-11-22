CREATE OR REPLACE FUNCTION public.registrar_devolucion_pt(
  p_codigo_pt text, p_cantidad numeric,
  p_estado_producto text DEFAULT 'bueno',
  p_motivo text DEFAULT NULL,
  p_lote_op text DEFAULT NULL,
  p_lote_eo text DEFAULT NULL,
  p_fecha_vencimiento date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_pt record;
  v_devolucion_id uuid;
  v_lote_pt_id uuid;
  v_existencia numeric;
  v_orden_id uuid;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  IF p_estado_producto NOT IN ('bueno','cuarentena','dañado') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = p_codigo_pt FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT no encontrado'; END IF;

  IF p_estado_producto = 'bueno' AND p_lote_op IS NOT NULL THEN
    -- Buscar si el lote ya existe en el sistema
    SELECT id INTO v_lote_pt_id FROM public.lotes_pt
      WHERE codigo_pt = p_codigo_pt AND lote_op = p_lote_op
        AND lote_eo IS NOT DISTINCT FROM p_lote_eo AND estado = 'en_bodega'
      FOR UPDATE;

    IF v_lote_pt_id IS NOT NULL THEN
      -- El lote existe, solo sumamos la cantidad
      UPDATE public.lotes_pt
        SET cantidad_inicial = cantidad_inicial + p_cantidad,
            cantidad_actual = cantidad_actual + p_cantidad
        WHERE id = v_lote_pt_id;
    ELSE
      -- El lote NO existe (es histórico), lo creamos
      -- Intentamos buscar la OP por el número de lote
      SELECT id INTO v_orden_id FROM public.ordenes_semanales WHERE numero_op = p_lote_op LIMIT 1;

      INSERT INTO public.lotes_pt
        (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado, fecha_produccion, fecha_vencimiento)
      VALUES
        (p_codigo_pt, p_lote_op, p_lote_eo, v_orden_id, p_cantidad, p_cantidad, 'en_bodega', now(), p_fecha_vencimiento)
      RETURNING id INTO v_lote_pt_id;
    END IF;

    -- Sumamos al stock general del PT
    UPDATE public.productos_terminados
      SET existencia_actual = existencia_actual + p_cantidad
      WHERE codigo_pt = p_codigo_pt;
  END IF;

  -- Registrar en el historial de devoluciones
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