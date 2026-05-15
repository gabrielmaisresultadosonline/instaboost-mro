ALTER TABLE whatsapp_page_settings ADD COLUMN IF NOT EXISTS photo_url TEXT;
UPDATE whatsapp_page_settings SET photo_url = '/gabriel-photo.webp' WHERE photo_url IS NULL;