/**
 * Insights (seções 23–25).
 *
 * Correção do defeito D4: os rótulos vêm de `constants/fail-reasons.ts`, com o enum como
 * fonte única. O mapa paralelo anterior tinha chaves que não existiam (`time`, `energy`,
 * `priority`) e o gráfico renderizava `lack_of_time` cru para 8 dos 10 motivos.
 *
 * Regra de honestidade estatística, aplicada em toda a tela: nenhum padrão é afirmado
 * abaixo de `MIN_SAMPLE_FOR_INSIGHT` registros. "Quarta-feira é seu melhor dia" apoiado
 * em duas tarefas não é um insight — é ruído com aparência de precisão, e destrói a
 * confiança em todos os números da página.
 *
 * Sobre a forma: cada recorte é uma série única de magnitude, então é barra horizontal de
 * matiz única com o valor rotulado direto na barra. Série única não pede legenda, e o
 * número nunca é codificado só por cor.
 */

import { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore, habitCheckInDates, useActiveHabits, streakOptionsOf } from '../store/useHabitStore';
import { useLevelProgress, useXpTotal } from '../store/useProfileStore';
import {
  MIN_SAMPLE_FOR_INSIGHT,
  completionByHourBucket,
  completionByWeekday,
  completionStats,
  failReasonBreakdown,
  totalPostponements,
} from '../domain/metrics';
import { calculateStreak } from '../domain/streaks';
import { FAIL_REASONS } from '../constants/fail-reasons';
import { today } from '../lib/date';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

export function Insights() {
  const tasks = useTaskStore((state) => state.tasks);
  const habits = useActiveHabits();
  const habitLogs = useHabitStore((state) => state.logs);
  const xpTotal = useXpTotal();
  const { level } = useLevelProgress();

  const todayIso = today();

  const stats = useMemo(() => completionStats(tasks), [tasks]);
  const failReasons = useMemo(() => failReasonBreakdown(tasks), [tasks]);
  const byWeekday = useMemo(
    () => completionByWeekday(tasks).filter((row) => row.sample > 0),
    [tasks],
  );
  const byHour = useMemo(
    () => completionByHourBucket(tasks).filter((row) => row.sample > 0),
    [tasks],
  );

  const bestStreak = useMemo(
    () =>
      habits.reduce((best, habit) => {
        const streak = calculateStreak(
          habitCheckInDates(habitLogs, habit.id),
          streakOptionsOf(habit),
          todayIso,
        );
        return Math.max(best, streak);
      }, 0),
    [habits, habitLogs, todayIso],
  );

  const hasEnoughData = stats.evaluated >= MIN_SAMPLE_FOR_INSIGHT;

  if (stats.evaluated === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PageHeader />
        <EmptyState
          icon={<BarChart2 size={32} strokeWidth={1.5} />}
          title="Ainda não há o que analisar"
          description="Os insights aparecem depois que você registrar o que aconteceu com as atividades — inclusive as que não foram feitas. É o registro do motivo que permite encontrar padrões."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader />

      {!hasEnoughData && (
        <p className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
          Com {stats.evaluated}{' '}
          {stats.evaluated === 1 ? 'registro' : 'registros'}, ainda não dá para afirmar
          padrões. A partir de {MIN_SAMPLE_FOR_INSIGHT} os recortes por dia e horário
          passam a ser exibidos.
        </p>
      )}

      <section aria-label="Números gerais" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          value={`${stats.rate}%`}
          label="Taxa de conclusão"
          detail={`${stats.completed} de ${stats.completed + stats.failed} avaliadas`}
        />
        <Stat
          value={String(stats.unevaluated)}
          label="Sem registro"
          detail="Venceram e não foram avaliadas"
        />
        <Stat value={String(totalPostponements(tasks))} label="Adiamentos" detail="Total acumulado" />
        <Stat value={String(xpTotal)} label="XP total" detail={`Nível ${level} · streak ${bestStreak}`} />
      </section>

      {failReasons.length > 0 && (
        <Panel
          title="Por que as atividades não aconteceram"
          caption={`${failReasons.reduce((sum, r) => sum + r.count, 0)} registros com motivo`}
        >
          <BreakdownList
            rows={failReasons.map((row) => ({
              key: row.reason,
              label: FAIL_REASONS[row.reason].label,
              value: row.count,
              suffix: `${row.share}%`,
            }))}
          />
          {failReasons[0].share >= 30 && (
            <Note>
              {FAIL_REASONS[failReasons[0].reason].label} responde por{' '}
              {failReasons[0].share}% das atividades não realizadas.
            </Note>
          )}
        </Panel>
      )}

      {hasEnoughData && byWeekday.length > 1 && (
        <Panel title="Conclusão por dia da semana" caption="Percentual sobre as avaliadas">
          <BreakdownList
            rows={byWeekday.map((row) => ({
              key: String(row.key),
              label: row.label,
              value: row.rate,
              max: 100,
              suffix: `${row.sample} ${row.sample === 1 ? 'registro' : 'registros'}`,
              muted: row.sample < MIN_SAMPLE_FOR_INSIGHT,
            }))}
          />
        </Panel>
      )}

      {hasEnoughData && byHour.length > 1 && (
        <Panel title="Conclusão por faixa de horário" caption="Percentual sobre as avaliadas">
          <BreakdownList
            rows={byHour.map((row) => ({
              key: String(row.key),
              label: row.label,
              value: row.rate,
              max: 100,
              suffix: `${row.sample} ${row.sample === 1 ? 'registro' : 'registros'}`,
              muted: row.sample < MIN_SAMPLE_FOR_INSIGHT,
            }))}
          />
          <Note>
            Faixas com poucos registros aparecem esmaecidas: elas ainda não têm amostra
            para sustentar conclusão.
          </Note>
        </Panel>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Insights</h1>
      <p className="mt-0.5 text-sm text-neutral-500">
        O que o seu histórico mostra sobre a sua rotina.
      </p>
    </header>
  );
}

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5">
      <p className="text-xl font-semibold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-neutral-700">{label}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {caption && <span className="text-xs text-neutral-500">{caption}</span>}
      </div>
      {children}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-600">{children}</p>;
}

interface BreakdownRow {
  key: string;
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  muted?: boolean;
}

/**
 * Barras horizontais de série única.
 *
 * É uma `<dl>` de propósito: a leitura sem enxergar a barra continua completa, o que
 * dispensa uma "visualização em tabela" separada. A barra é uma camada visual sobre um
 * texto que já basta — o valor nunca depende só da cor ou do comprimento.
 */
function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  const ceiling = Math.max(...rows.map((row) => row.max ?? row.value), 1);

  return (
    <dl className="space-y-2.5">
      {rows.map((row) => {
        const width = Math.max((row.value / ceiling) * 100, 2);
        return (
          <div key={row.key} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
            <dt className="truncate text-sm text-neutral-700">{row.label}</dt>
            <dd className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    row.muted ? 'bg-neutral-300' : 'bg-neutral-800',
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-900">
                {row.value}
                {row.max === 100 ? '%' : ''}
              </span>
            </dd>
            <dd className="w-24 shrink-0 text-right text-xs tabular-nums text-neutral-500">
              {row.suffix}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
