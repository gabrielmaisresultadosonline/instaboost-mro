WITH latest AS (
  SELECT DISTINCT ON (lower(username)) lower(username) AS uname, password, customer_email
  FROM public.created_accesses
  ORDER BY lower(username), created_at DESC
)
UPDATE public.mro_tool_users u
SET password_plain = COALESCE(u.password_plain, l.password),
    email = COALESCE(u.email, NULLIF(lower(l.customer_email), ''))
FROM latest l
WHERE lower(u.username) = l.uname;

WITH latest AS (
  SELECT DISTINCT ON (lower(username)) lower(username) AS uname, password, customer_email
  FROM public.created_accesses
  ORDER BY lower(username), created_at DESC
)
UPDATE public.zapmro_users u
SET password_plain = COALESCE(u.password_plain, l.password),
    email = COALESCE(u.email, NULLIF(lower(l.customer_email), ''))
FROM latest l
WHERE lower(u.username) = l.uname;

WITH latest AS (
  SELECT DISTINCT ON (lower(username)) lower(username) AS uname, lower(email) AS email
  FROM public.mro_orders
  WHERE email IS NOT NULL
  ORDER BY lower(username), created_at DESC
)
UPDATE public.mro_tool_users u
SET email = l.email
FROM latest l
WHERE u.email IS NULL AND lower(u.username) = l.uname;