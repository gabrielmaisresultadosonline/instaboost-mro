import Tesseract from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';

const RESERVED_WORDS = new Set([
  'instagram', 'editar', 'perfil', 'publicacoes', 'publicação', 'publicacoes', 'posts', 'post',
  'seguidores', 'seguindo', 'mensagem', 'mensagens', 'arquivo', 'arquivados', 'itens', 'salvo',
  'simule', 'bio', 'link', 'mais', 'contato', 'profissional', 'criador', 'conteudo', 'digital',
  'especialista', 'aprovacao', 'aprovação', 'consorcio', 'consórcio', 'perfil.', 'ver'
]);

export const normalizeInstagramUsername = (value: string) =>
  value.toLowerCase().replace('@', '').trim();

const isLikelyUsername = (value: string) => {
  const candidate = normalizeInstagramUsername(value)
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+|[._]+$/g, '');

  if (!candidate || candidate.length < 3 || candidate.length > 30) return false;
  if (!/[a-z]/.test(candidate)) return false;
  if (!/^[a-z0-9._]+$/.test(candidate)) return false;
  if (RESERVED_WORDS.has(candidate)) return false;
  return true;
};

export const extractUsernameFromOcrText = (rawText: string): string | null => {
  if (!rawText) return null;

  const normalizedText = rawText
    .replace(/[|]/g, 'l')
    .replace(/[\u2018\u2019\u201C\u201D]/g, '')
    .replace(/\s+/g, ' ');

  const directMatches = normalizedText.match(/@?[a-z0-9._]{3,30}/gi) || [];
  for (const match of directMatches) {
    const cleaned = normalizeInstagramUsername(match);
    if (isLikelyUsername(cleaned)) return cleaned;
  }

  const firstLines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of firstLines) {
    const tokens = line.split(/\s+/).map((token) => token.replace(/[^a-zA-Z0-9._@]/g, ''));
    for (const token of tokens) {
      const cleaned = normalizeInstagramUsername(token);
      if (isLikelyUsername(cleaned)) return cleaned;
    }
  }

  return null;
};

export const readInstagramScreenshot = async (source: File | string): Promise<{ text: string; detectedUsername: string | null }> => {
  const result = await Tesseract.recognize(source, 'eng+por');
  const text = result.data.text || '';
  return {
    text,
    detectedUsername: extractUsernameFromOcrText(text),
  };
};

export const restoreStoredScreenshot = async ({
  username,
  squarecloudUsername,
  screenshotUrl,
}: {
  username: string;
  squarecloudUsername: string;
  screenshotUrl?: string | null;
}) => {
  const action = screenshotUrl ? 'set' : 'clear';

  const { error } = await supabase.functions.invoke('upload-profile-screenshot', {
    body: {
      action,
      username,
      squarecloud_username: squarecloudUsername,
      screenshot_url: screenshotUrl ?? null,
    },
  });

  if (error) {
    console.error('Erro ao restaurar screenshot salvo:', error);
  }
};