-- 1. Eliminar la columna 'lote' de las órdenes (usaremos el numero_op)
ALTER TABLE public.ordenes_semanales DROP COLUMN IF EXISTS lote;
ALTER TABLE public.lotes_pt DROP CONSTRAINT IF EXISTS lotes_pt_codigo_pt_lote_op_lote_eo_estado_key;
DROP INDEX IF EXISTS public.lotes_pt_unique_idx;
CREATE UNIQUE INDEX lotes_pt_unique_idx ON public.lotes_pt
  (codigo_pt, lote_op, COALESCE(lote_eo, '∅'), estado);

-- 2. Actualizar RPC de entrega de OP (Lote = Numero OP)
CREATE OR REPLACE FUNCTION public.registrar_entrega_op(
  p_orden_id uuid, p_cantidad numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_op record; v_pt record; v_pendiente numeric; v_producido_antes numeric;
  v_insumo_req jsonb; v_key text; v_cant_req numeric; v_faltantes jsonb := '[]'::jsonb;
  v_insumo record; v_sub record; v_lote_pt_id uuid; v_estado_lote text; v_items int := 0;
  v_fecha_vencimiento date;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  SELECT * INTO v_op FROM public.ordenes_semanales WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OP no encontrada'; END IF;
  IF v_op.estado_op IN ('Terminada','Cancelada') THEN RAISE EXCEPTION 'OP cerrada'; END IF;

  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = v_op.codigo_pt;
  v_producido_antes := v_op.cantidad_producida;
  v_pendiente := v_op.cantidad_proyectada - v_producido_antes;
  IF p_cantidad > v_pendiente THEN RAISE EXCEPTION 'Excede pendiente'; END IF;

  v_insumo_req := public.simular_consumo_pt(v_op.codigo_pt, p_cantidad)->'insumo_req';
  FOR v_key IN SELECT jsonb_object_keys(v_insumo_req) LOOP
    v_cant_req := (v_insumo_req->>v_key)::numeric;
    SELECT * INTO v_insumo FROM public.insumos WHERE id = v_key::uuid FOR UPDATE;
    IF v_insumo.existencia_actual < v_cant_req THEN
      v_faltantes := v_faltantes || jsonb_build_object('nombre',v_insumo.nombre,'requerido',v_cant_req,'existencia',v_insumo.existencia_actual);
    END IF;
  END LOOP;
  IF jsonb_array_length(v_faltantes) > 0 THEN RAISE EXCEPTION 'Stock insuficiente: %', v_faltantes::text; END IF;

  FOR v_sub IN SELECT subproducto_id, cantidad FROM public.paquete_subproductos WHERE codigo_pt = v_op.codigo_pt LOOP
    PERFORM public.consumir_subproducto_recursivo(v_sub.subproducto_id, v_sub.cantidad * p_cantidad, p_orden_id, ARRAY[]::uuid[]);
  END LOOP;

  FOR v_insumo IN SELECT insumo_id, cantidad_por_unidad FROM public.bom_recetas WHERE codigo_pt = v_op.codigo_pt LOOP
    PERFORM public.consumir_insumo_fifo(v_insumo.insumo_id, v_insumo.cantidad_por_unidad * p_cantidad, 'Consumo OP', p_orden_id, 'consumo', NULL);
  END LOOP;

  INSERT INTO public.entregas_op (orden_id, cantidad, motivo, usuario_email) VALUES (p_orden_id, p_cantidad, p_motivo, public.current_user_email());

  v_estado_lote := CASE WHEN v_pt.requiere_esterilizacion THEN 'en_planta' ELSE 'en_bodega' END;
  v_fecha_vencimiento := (now() + (v_pt.vida_util_meses || ' months')::interval - interval '1 day')::date;

  SELECT id INTO v_lote_pt_id FROM public.lotes_pt
    WHERE codigo_pt = v_op.codigo_pt AND lote_op = v_op.numero_op AND lote_eo IS NULL AND estado = v_estado_lote FOR UPDATE;

  IF v_lote_pt_id IS NOT NULL THEN
    UPDATE public.lotes_pt SET cantidad_inicial = cantidad_inicial + p_cantidad, cantidad_actual = cantidad_actual + p_cantidad WHERE id = v_lote_pt_id;
  ELSE
    INSERT INTO public.lotes_pt (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado, fecha_produccion, fecha_vencimiento)
    VALUES (v_op.codigo_pt, v_op.numero_op, NULL, v_op.id, p_cantidad, p_cantidad, v_estado_lote, now(), v_fecha_vencimiento)
    RETURNING id INTO v_lote_pt_id;
  END IF;

  IF NOT v_pt.requiere_esterilizacion THEN
    UPDATE public.productos_terminados SET existencia_actual = existencia_actual + p_cantidad WHERE codigo_pt = v_op.codigo_pt;
  END IF;

  INSERT INTO public.movimientos (tipo, cantidad, lote_pt_id, orden_id, observaciones) VALUES ('produccion_pt', p_cantidad, v_lote_pt_id, v_op.id, 'Entrega de OP');

  UPDATE public.ordenes_semanales
    SET cantidad_producida = v_producido_antes + p_cantidad,
        estado_op = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada THEN 'Terminada' ELSE 'En proceso' END,
        fecha_completado = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada THEN now() ELSE NULL END
    WHERE id = p_orden_id;

  RETURN jsonb_build_object('ok', true, 'cantidad_producida', v_producido_antes + p_cantidad, 'op_cerrada', (v_producido_antes + p_cantidad) >= v_op.cantidad_proyectada);
END; $$;

-- 3. RPC Traslado a Central (Solo cambia estado)
CREATE OR REPLACE FUNCTION public.trasladar_a_central(p_lotes_pt jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_item jsonb; v_lote_id uuid; v_cant numeric; v_count int := 0;
BEGIN
  PERFORM public.validar_escritura();
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lotes_pt) LOOP
    v_lote_id := (v_item->>'lote_pt_id')::uuid;
    v_cant := (v_item->>'cantidad')::numeric;
    
    -- Mover de en_planta a en_central
    UPDATE public.lotes_pt SET cantidad_actual = cantidad_actual - v_cant WHERE id = v_lote_id AND estado = 'en_planta';
    
    INSERT INTO public.lotes_pt (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado, fecha_produccion, fecha_vencimiento)
    SELECT codigo_pt, lote_op, NULL, orden_id, v_cant, v_cant, 'en_central', fecha_produccion, fecha_vencimiento
    FROM public.lotes_pt WHERE id = v_lote_id
    RETURNING id INTO v_lote_id;

    INSERT INTO public.movimientos (tipo, cantidad, lote_pt_id, orden_id, observaciones) VALUES ('envio_central', v_cant, v_lote_id, (SELECT orden_id FROM public.lotes_pt WHERE id = v_lote_id), 'Traslado a central');
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'items', v_count);
END; $$;

-- 4. RPC Ciclo EO (Recibe, asigna lote y pasa a bodega)
CREATE OR REPLACE FUNCTION public.recibir_ciclo_eo(p_carga_id uuid, p_numero_carga text, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_item jsonb; v_lote_id uuid; v_rec numeric; v_rech numeric; v_carga record; v_total_rec numeric := 0;
BEGIN
  PERFORM public.validar_escritura();
  
  -- Registrar la carga (si no existe, la creamos aquí mismo)
  INSERT INTO public.cargas_eo (id, numero_carga, estado, fecha_recepcion) 
  VALUES (COALESCE(p_carga_id, gen_random_uuid()), p_numero_carga, 'recibida', now()) 
  ON CONFLICT (id) DO UPDATE SET estado = 'recibida', fecha_recepcion = now()
  RETURNING * INTO v_carga;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_lote_id := (v_item->>'lote_pt_id')::uuid;
    v_rec := COALESCE((v_item->>'cantidad_recibida')::numeric, 0);
    v_rech := COALESCE((v_item->>'cantidad_rechazada')::numeric, 0);

    UPDATE public.lotes_pt SET cantidad_actual = cantidad_actual - (v_rec + v_rech) WHERE id = v_lote_id AND estado = 'en_central';

    IF v_rec > 0 THEN
      INSERT INTO public.lotes_pt (codigo_pt, lote_op, lote_eo, orden_id, carga_eo_id, cantidad_inicial, cantidad_actual, estado, fecha_produccion, fecha_esterilizacion, fecha_vencimiento)
      SELECT codigo_pt, lote_op, p_numero_carga, orden_id, v_carga.id, v_rec, v_rec, 'en_bodega', fecha_produccion, now(), fecha_vencimiento
      FROM public.lotes_pt WHERE id = v_lote_id;
      
      INSERT INTO public.movimientos (tipo, cantidad, lote_pt_id, orden_id, carga_eo_id, observaciones) 
      SELECT 'recepcion_central', v_rec, id, orden_id, v_carga.id, 'Esterilizado ' || p_numero_carga FROM public.lotes_pt WHERE lote_eo = p_numero_carga AND estado = 'en_bodega' ORDER BY fecha_produccion DESC LIMIT 1;

      UPDATE public.productos_terminados 
      SET existencia_actual = existencia_actual + v_rec 
      WHERE codigo_pt = (SELECT codigo_pt FROM public.lotes_pt WHERE id = v_lote_id);
    END IF;

    IF v_rech > 0 THEN
      INSERT INTO public.lotes_pt (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado, fecha_produccion, fecha_vencimiento)
      SELECT codigo_pt, lote_op, NULL, orden_id, v_rech, v_rech, 'en_reproceso', fecha_produccion, fecha_vencimiento
      FROM public.lotes_pt WHERE id = v_lote_id;
    END IF;
    v_total_rec := v_total_rec + v_rec;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'total_recibido', v_total_rec);
END; $$;

CREATE OR REPLACE FUNCTION public.confirmar_orden(
  p_codigo_pt text, p_cantidad numeric,
  p_estado_cobertura text, p_detalle jsonb,
  p_numero_op text DEFAULT NULL,
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
  
  -- Insertamos usando p_numero_op en la columna 'lote' (según el diseño de la Fase 0)
  -- Nota: Asegúrate de que la columna lote aún exista en la tabla. 
  -- Si la borraste en el paso anterior, quita "lote," y "p_numero_op," de esta consulta.
  
  INSERT INTO public.ordenes_semanales
    (codigo_pt, cantidad_proyectada, estado_cobertura, detalle_faltantes,
     numero_op, prioridad, fecha_programada, fecha_fin_programada)
  VALUES
    (p_codigo_pt, p_cantidad, p_estado_cobertura, p_detalle,
     p_numero_op, p_prioridad, p_fecha_programada, p_fecha_fin_programada)
  RETURNING * INTO v_orden;
  
  RETURN v_orden;
END;
$$;

-- 1. Borrar la versión vieja (la que pedía p_lote)
DROP FUNCTION IF EXISTS public.confirmar_orden(text, numeric, text, jsonb, text, text, integer, date, date);
-- 2. Borrar la versión nueva (por si acaso)
DROP FUNCTION IF EXISTS public.confirmar_orden(text, numeric, text, jsonb, text, integer, date, date);

-- 3. Crear la versión definitiva y limpia
CREATE OR REPLACE FUNCTION public.confirmar_orden(
  p_codigo_pt text, 
  p_cantidad numeric,
  p_estado_cobertura text, 
  p_detalle jsonb,
  p_numero_op text DEFAULT NULL,
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
  
  -- Insertamos la orden. 
  -- NOTA: Si en el paso anterior NO borraste la columna 'lote' de la tabla, 
  -- debes agregar "lote," en los campos y "p_numero_op," en los VALUES.
  INSERT INTO public.ordenes_semanales
    (codigo_pt, cantidad_proyectada, estado_cobertura, detalle_faltantes,
     numero_op, prioridad, fecha_programada, fecha_fin_programada)
  VALUES
    (p_codigo_pt, p_cantidad, p_estado_cobertura, p_detalle,
     p_numero_op, p_prioridad, p_fecha_programada, p_fecha_fin_programada)
  RETURNING * INTO v_orden;
  
  RETURN v_orden;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_entrega_op(
  p_orden_id uuid, p_cantidad numeric, p_motivo text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_op record; v_pt record; v_pendiente numeric; v_producido_antes numeric;
  v_insumo_req jsonb; v_key text; v_cant_req numeric; v_faltantes jsonb := '[]'::jsonb;
  v_insumo record; v_sub record; v_lote_pt_id uuid; v_estado_lote text; v_items int := 0;
  v_fecha_vencimiento date;
BEGIN
  PERFORM public.validar_escritura();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad > 0'; END IF;
  SELECT * INTO v_op FROM public.ordenes_semanales WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OP no encontrada'; END IF;
  IF v_op.estado_op IN ('Terminada','Cancelada') THEN RAISE EXCEPTION 'OP cerrada'; END IF;

  SELECT * INTO v_pt FROM public.productos_terminados WHERE codigo_pt = v_op.codigo_pt;
  v_producido_antes := v_op.cantidad_producida;
  v_pendiente := v_op.cantidad_proyectada - v_producido_antes;
  IF p_cantidad > v_pendiente THEN RAISE EXCEPTION 'Excede pendiente'; END IF;

  v_insumo_req := public.simular_consumo_pt(v_op.codigo_pt, p_cantidad)->'insumo_req';
  FOR v_key IN SELECT jsonb_object_keys(v_insumo_req) LOOP
    v_cant_req := (v_insumo_req->>v_key)::numeric;
    SELECT * INTO v_insumo FROM public.insumos WHERE id = v_key::uuid FOR UPDATE;
    IF v_insumo.existencia_actual < v_cant_req THEN
      v_faltantes := v_faltantes || jsonb_build_object('nombre',v_insumo.nombre,'requerido',v_cant_req,'existencia',v_insumo.existencia_actual);
    END IF;
  END LOOP;
  IF jsonb_array_length(v_faltantes) > 0 THEN RAISE EXCEPTION 'Stock insuficiente: %', v_faltantes::text; END IF;

  FOR v_sub IN SELECT subproducto_id, cantidad FROM public.paquete_subproductos WHERE codigo_pt = v_op.codigo_pt LOOP
    PERFORM public.consumir_subproducto_recursivo(v_sub.subproducto_id, v_sub.cantidad * p_cantidad, p_orden_id, ARRAY[]::uuid[]);
  END LOOP;

  FOR v_insumo IN SELECT insumo_id, cantidad_por_unidad FROM public.bom_recetas WHERE codigo_pt = v_op.codigo_pt LOOP
    PERFORM public.consumir_insumo_fifo(v_insumo.insumo_id, v_insumo.cantidad_por_unidad * p_cantidad, 'Consumo OP', p_orden_id, 'consumo', NULL);
  END LOOP;

  INSERT INTO public.entregas_op (orden_id, cantidad, motivo, usuario_email) VALUES (p_orden_id, p_cantidad, p_motivo, public.current_user_email());

  -- CAMBIO CLAVE: Si requiere esterilización, va directo a 'en_central'. Si no, a 'en_bodega'.
  v_estado_lote := CASE WHEN v_pt.requiere_esterilizacion THEN 'en_central' ELSE 'en_bodega' END;
  
  v_fecha_vencimiento := (now() + (v_pt.vida_util_meses || ' months')::interval - interval '1 day')::date;

  SELECT id INTO v_lote_pt_id FROM public.lotes_pt
    WHERE codigo_pt = v_op.codigo_pt AND lote_op = v_op.numero_op AND lote_eo IS NULL AND estado = v_estado_lote FOR UPDATE;

  IF v_lote_pt_id IS NOT NULL THEN
    UPDATE public.lotes_pt SET cantidad_inicial = cantidad_inicial + p_cantidad, cantidad_actual = cantidad_actual + p_cantidad WHERE id = v_lote_pt_id;
  ELSE
    INSERT INTO public.lotes_pt (codigo_pt, lote_op, lote_eo, orden_id, cantidad_inicial, cantidad_actual, estado, fecha_produccion, fecha_vencimiento)
    VALUES (v_op.codigo_pt, v_op.numero_op, NULL, v_op.id, p_cantidad, p_cantidad, v_estado_lote, now(), v_fecha_vencimiento)
    RETURNING id INTO v_lote_pt_id;
  END IF;

  IF NOT v_pt.requiere_esterilizacion THEN
    UPDATE public.productos_terminados SET existencia_actual = existencia_actual + p_cantidad WHERE codigo_pt = v_op.codigo_pt;
  END IF;

  INSERT INTO public.movimientos (tipo, cantidad, lote_pt_id, orden_id, observaciones) VALUES ('produccion_pt', p_cantidad, v_lote_pt_id, v_op.id, 'Entrega de OP');

  UPDATE public.ordenes_semanales
    SET cantidad_producida = v_producido_antes + p_cantidad,
        estado_op = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada THEN 'Terminada' ELSE 'En proceso' END,
        fecha_completado = CASE WHEN (v_producido_antes + p_cantidad) >= cantidad_proyectada THEN now() ELSE NULL END
    WHERE id = p_orden_id;

  RETURN jsonb_build_object('ok', true, 'cantidad_producida', v_producido_antes + p_cantidad, 'op_cerrada', (v_producido_antes + p_cantidad) >= v_op.cantidad_proyectada);
END; $$;

-- Limpiar los lotes viejos que quedaron en 'en_planta' de tus pruebas
UPDATE public.lotes_pt SET estado = 'en_central' WHERE estado = 'en_planta';