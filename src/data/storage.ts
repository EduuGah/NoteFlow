/**
 * Adaptador de persistência local.
 *
 * Envolve `localStorage` com três garantias que o acesso direto não dá:
 *
 * 1. **Não derruba o aplicativo.** Em janela anônima, com cookies bloqueados ou com a cota
 *    estourada, `localStorage` lança ao ser lido ou escrito. Aqui a falha vira um recuo
 *    silencioso para memória: os dados daquela sessão não sobrevivem ao refresh, mas a
 *    interface continua funcionando em vez de mostrar tela branca.
 * 2. **Namespace.** Toda chave leva o prefixo do produto, para conviver com outras
 *    aplicações servidas da mesma origem em desenvolvimento.
 * 3. **Versionamento.** Cada store declara sua versão; `zustand/persist` chama a migração
 *    quando o dado gravado é mais antigo que o código que o lê.
 */

import type { StateStorage } from 'zustand/middleware';
import { STORAGE_PREFIX } from '../constants/app';

function isBrowserStorageAvailable(): boolean {
  try {
    const probe = `${STORAGE_PREFIX}:probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const memoryFallback = new Map<string, string>();

let available: boolean | null = null;

function useBrowserStorage(): boolean {
  if (available === null) {
    available = typeof window !== 'undefined' && isBrowserStorageAvailable();
    if (!available && typeof window !== 'undefined') {
      console.warn(
        '[NoteFlow] localStorage indisponível. Os dados desta sessão não serão preservados.',
      );
    }
  }
  return available;
}

function key(name: string): string {
  return `${STORAGE_PREFIX}:${name}`;
}

export const localStateStorage: StateStorage = {
  getItem(name) {
    try {
      return useBrowserStorage()
        ? window.localStorage.getItem(key(name))
        : (memoryFallback.get(key(name)) ?? null);
    } catch {
      return null;
    }
  },

  setItem(name, value) {
    try {
      if (useBrowserStorage()) window.localStorage.setItem(key(name), value);
      else memoryFallback.set(key(name), value);
    } catch {
      // Cota estourada: preferimos perder a escrita a perder a sessão do usuário.
      memoryFallback.set(key(name), value);
    }
  },

  removeItem(name) {
    try {
      if (useBrowserStorage()) window.localStorage.removeItem(key(name));
      else memoryFallback.delete(key(name));
    } catch {
      memoryFallback.delete(key(name));
    }
  },
};

/** Apaga todos os dados do NoteFlow. Base do "excluir meus dados" da seção 41. */
export function clearAllLocalData(): void {
  if (!useBrowserStorage()) {
    memoryFallback.clear();
    return;
  }
  const doomed: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(`${STORAGE_PREFIX}:`)) doomed.push(k);
  }
  doomed.forEach((k) => window.localStorage.removeItem(k));
}
