/**
 * Geração de identificadores.
 *
 * `crypto.randomUUID()` só existe em contexto seguro (https ou localhost). O script de
 * desenvolvimento serve em `0.0.0.0:3000`, então abrir o aplicativo pelo IP da rede local
 * — que é exatamente o que se faz para testar no celular, e a seção 49 diz que mobile é a
 * experiência prioritária — cai num contexto inseguro onde `randomUUID` é `undefined`.
 * Sem este recuo, criar qualquer tarefa pelo celular lançaria TypeError.
 */

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
