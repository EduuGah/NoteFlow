/**
 * Configuração compartilhada de persistência das stores.
 *
 * Centralizar aqui garante que toda store use o mesmo adaptador tolerante a falhas e o
 * mesmo namespace, e dá um único ponto para trocar o backend de armazenamento quando o
 * Supabase entrar.
 */

import { persist, createJSONStorage } from 'zustand/middleware';
import type { PersistOptions } from 'zustand/middleware';
import { localStateStorage } from '../data/storage';

type Persister<T> = Parameters<typeof persist<T>>[0];

interface StorePersistOptions<T> {
  name: string;
  version: number;
  partialize?: PersistOptions<T>['partialize'];
}

export function createStorePersist<T>(
  initializer: Persister<T>,
  { name, version, partialize }: StorePersistOptions<T>,
) {
  return persist(initializer, {
    name,
    version,
    storage: createJSONStorage(() => localStateStorage),
    // A chave só entra no objeto quando há função. O zustand testa a presença da
    // propriedade, e não o valor: passar `partialize: undefined` explicitamente faz
    // toda escrita lançar `options.partialize is not a function`.
    ...(partialize ? { partialize } : {}),
  });
}
