/**
 * Constantes de aplicação.
 */

/**
 * Dono dos dados enquanto não existe autenticação.
 *
 * Todo registro já nasce com `user_id` preenchido para que a migração ao Supabase seja
 * uma troca de valor, e não uma migração de schema: as políticas de RLS comparam
 * `user_id = auth.uid()`, e uma coluna que só passa a existir depois exigiria backfill.
 */
export const LOCAL_USER_ID = 'local-user';

/** Prefixo de todas as chaves em `localStorage`. */
export const STORAGE_PREFIX = 'noteflow';
