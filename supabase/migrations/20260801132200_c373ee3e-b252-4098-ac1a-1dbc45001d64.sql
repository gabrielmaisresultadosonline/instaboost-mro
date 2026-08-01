UPDATE public.mro_tool_users
SET password_plain = btrim(password_plain),
    password_hash = CASE WHEN username = 'eanesvip' THEN '93ae4a40b31fcb8587b32077b1750d50a0fc947fd88a5473b50dd8d3eedcf383' ELSE password_hash END
WHERE password_plain IS NOT NULL AND password_plain <> btrim(password_plain);

UPDATE public.zapmro_users
SET password_plain = btrim(password_plain)
WHERE password_plain IS NOT NULL AND password_plain <> btrim(password_plain);