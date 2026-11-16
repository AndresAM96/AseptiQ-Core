-- 1. Restaurar permisos de esquema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Permitir lectura general
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 3. Permitir escritura directa (RLS se encargará de bloquear si no es admin/operador)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 4. Bloquear escritura directa en las tablas que son EXCLUSIVAS de RPCs
REVOKE INSERT, UPDATE, DELETE ON public.movimientos FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.insumo_lotes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.lotes_pt FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ordenes_semanales FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.entregas_op FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.subproducto_producciones FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cargas_eo FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.carga_eo_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.despachos FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.devoluciones_pt FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.backup_log FROM authenticated;

-- 5. Asegurarnos de que tu usuario sea admin (cambia el correo por el tuyo)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'tu_correo@mail.com';