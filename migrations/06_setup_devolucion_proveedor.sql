-- 1. Permitir el nuevo tipo de movimiento
ALTER TABLE public.movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check;
ALTER TABLE public.movimientos ADD CONSTRAINT movimientos_tipo_check CHECK (tipo IN (
  'entrada','salida','consumo','ajuste',
  'produccion_subproducto','consumo_subproducto',
  'produccion_pt','envio_central','recepcion_central',
  'reproceso','despacho','devolucion_proveedor'
));

-- 2. Actualizar los registros viejos que hiciste en tus pruebas
UPDATE public.movimientos
SET tipo = 'devolucion_proveedor'
WHERE tipo = 'salida' AND insumo_lote_id IS NOT NULL;

-- 3. Actualizar la función de devolución
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
      (tipo, cantidad, insumo_id, insumo_lote_id, costo_unitario_momento, observaciones, usuario_email)
    SELECT 'devolucion_proveedor', p_cantidad, p_insumo_id, id, v_insumo.costo_unitario,
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
        (tipo, cantidad, insumo_id, insumo_lote_id, costo_unitario_momento, observaciones, usuario_email)
      VALUES
        ('devolucion_proveedor', v_tomar, p_insumo_id, v_lote_rec.id, v_insumo.costo_unitario,
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