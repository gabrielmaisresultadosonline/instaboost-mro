CREATE OR REPLACE FUNCTION public.get_whatsapp_public_config()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  settings_row public.whatsapp_page_settings%ROWTYPE;
BEGIN
  SELECT *
  INTO settings_row
  FROM public.whatsapp_page_settings
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN jsonb_build_object(
    'whatsapp_number', COALESCE(settings_row.whatsapp_number, ''),
    'page_title', COALESCE(settings_row.page_title, 'Gabriel está disponível agora para te ajudar'),
    'page_subtitle', COALESCE(settings_row.page_subtitle, 'Sobre o que gostaria de falar clique no botão abaixo.'),
    'button_text', COALESCE(settings_row.button_text, 'FALAR NO WHATSAPP'),
    'whatsapp_message', COALESCE(settings_row.whatsapp_message, 'Olá, vim pelo site, gostaria de saber sobre o sistema inovador!'),
    'photo_url', COALESCE(settings_row.photo_url, '/gabriel-photo.webp'),
    'options', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'label', o.label,
          'message', o.message,
          'icon_type', o.icon_type,
          'color', o.color,
          'order_index', o.order_index
        )
        ORDER BY o.order_index ASC, o.created_at ASC
      )
      FROM public.whatsapp_page_options o
      WHERE o.is_active = true
    ), '[]'::jsonb)
  );
END;
$function$;