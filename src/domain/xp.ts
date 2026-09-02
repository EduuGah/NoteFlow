/**
 * Fórmula de XP.
 *
 * A seção 13 dá valores fixos por dificuldade; a 14 pede uma fórmula com multiplicadores;
 * as duas pedem simplicidade. A conciliação é uma fórmula única cujo caso central devolve
 * exatamente os números da seção 13:
 *
 *     XP = arredonda( base(dificuldade) × mult(prioridade) × fator(duração) )
 *
 * Uma tarefa média, de prioridade média e 30 minutos vale 25 XP — como na especificação.
 *
 * Consistência (streak) deliberadamente NÃO entra na fórmula. Multiplicar XP por streak
 * cria um efeito bola de neve: quem já vai bem ganha cada vez mais, e uma única falha
 * derruba o ganho por semanas. É exatamente a gamificação punitiva que a seção 47 proíbe.
 */

import type { TaskDifficulty, TaskPriority } from '../types/domain';

/** Teto por atividade. Impede que duração longa infle o XP sem limite. */
export const MAX_XP_PER_ACTIVITY = 120;
export const MIN_XP_PER_ACTIVITY = 5;

const TASK_BASE_XP: Record<TaskDifficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

/**
 * Hábitos valem um pouco menos por execução que a tarefa equivalente. O valor de um
 * hábito está na repetição, não no evento isolado — e um hábito diário com o mesmo XP de
 * uma tarefa difícil tornaria as tarefas irrelevantes na progressão.
 * O caso médio devolve 20 XP, o número citado na seção 13.
 */
const HABIT_BASE_XP: Record<TaskDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
};

const PRIORITY_MULTIPLIER: Record<TaskPriority, number> = {
  low: 0.9,
  medium: 1,
  high: 1.15,
  critical: 1.3,
};

/**
 * Duração acima de 30 minutos aumenta o XP linearmente até o teto de 1,5× em 150 minutos.
 * Sem duração informada, o fator é neutro — não penaliza quem usa o Quick Add.
 */
export function durationFactor(minutes: number | null | undefined): number {
  if (!minutes || minutes <= 30) return 1;
  const extra = Math.min(minutes, 150) - 30;
  return 1 + (extra / 120) * 0.5;
}

function clampXp(value: number): number {
  return Math.max(MIN_XP_PER_ACTIVITY, Math.min(MAX_XP_PER_ACTIVITY, Math.round(value)));
}

export interface TaskXpInput {
  difficulty: TaskDifficulty;
  priority: TaskPriority;
  durationMinutes?: number | null;
}

export function calculateTaskXp({
  difficulty,
  priority,
  durationMinutes,
}: TaskXpInput): number {
  return clampXp(
    TASK_BASE_XP[difficulty] *
      PRIORITY_MULTIPLIER[priority] *
      durationFactor(durationMinutes),
  );
}

export function calculateHabitXp(difficulty: TaskDifficulty): number {
  return clampXp(HABIT_BASE_XP[difficulty]);
}

/**
 * Chave de idempotência do ledger de XP.
 *
 * Concluir a mesma tarefa duas vezes (duplo clique, reenvio de requisição, sincronização
 * offline repetida) produz a mesma chave, e o repositório recusa a segunda inserção.
 * Sem isso, o XP total deixa de ser confiável — e com ele todo o perfil.
 */
export function xpIdempotencyKey(
  sourceType: string,
  sourceId: string,
  occurrenceKey?: string,
): string {
  return occurrenceKey
    ? `${sourceType}:${sourceId}:${occurrenceKey}`
    : `${sourceType}:${sourceId}`;
}
