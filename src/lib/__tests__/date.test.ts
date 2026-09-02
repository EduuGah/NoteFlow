/**
 * Testes de data.
 *
 * O caso central aqui é o defeito D6. Ele é invisível em teste que usa meio-dia: só
 * aparece perto da virada, que é justamente o horário das atividades noturnas que a
 * seção 23 quer analisar. Por isso os casos usam 22h e 23h59.
 */

import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  daysBetween,
  formatRelativeDay,
  fromIsoDate,
  isValidIsoDate,
  isWeekend,
  minutesOfDay,
  startOfWeekIso,
  toIsoDate,
  today,
  toLocalDateTime,
  weekdayOf,
} from '../date';

describe('toIsoDate', () => {
  it('usa o calendário local, e não o UTC (defeito D6)', () => {
    // 2 de setembro às 22h30 no fuso local. Em qualquer fuso a oeste de Greenwich,
    // `toISOString()` já teria virado para o dia 3 — que era exatamente o bug.
    const lateEvening = new Date(2026, 8, 2, 22, 30);
    expect(toIsoDate(lateEvening)).toBe('2026-09-02');
  });

  it('mantém o dia no último minuto antes da virada', () => {
    expect(toIsoDate(new Date(2026, 8, 2, 23, 59))).toBe('2026-09-02');
  });

  it('vira o dia só à meia-noite local', () => {
    expect(toIsoDate(new Date(2026, 8, 3, 0, 0))).toBe('2026-09-03');
  });

  it('faz ida e volta com fromIsoDate', () => {
    expect(toIsoDate(fromIsoDate('2026-02-28'))).toBe('2026-02-28');
  });

  it('today() aceita um instante injetado, para o teste ser determinístico', () => {
    expect(today(new Date(2026, 0, 15, 21, 0))).toBe('2026-01-15');
  });
});

describe('addDaysIso', () => {
  it('atravessa a virada de mês', () => {
    expect(addDaysIso('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('atravessa a virada de ano para trás', () => {
    expect(addDaysIso('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('lida com ano bissexto', () => {
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('não é afetado pelo horário de verão', () => {
    // Somar 1 dia sobre aritmética de milissegundos erraria numa virada de fuso;
    // date-fns opera sobre o calendário, então 30 dias continuam 30 dias.
    expect(daysBetween('2026-10-01', addDaysIso('2026-10-01', 30))).toBe(30);
  });
});

describe('daysBetween', () => {
  it('é positivo quando a segunda data é posterior', () => {
    expect(daysBetween('2026-09-01', '2026-09-05')).toBe(4);
  });

  it('é negativo no sentido inverso', () => {
    expect(daysBetween('2026-09-05', '2026-09-01')).toBe(-4);
  });

  it('é zero para a mesma data', () => {
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(0);
  });
});

describe('weekdayOf e isWeekend', () => {
  it('alinha com Date.getDay(): 0 é domingo', () => {
    expect(weekdayOf('2026-09-06')).toBe(0); // domingo
    expect(weekdayOf('2026-09-07')).toBe(1); // segunda
  });

  it('reconhece sábado e domingo como fim de semana', () => {
    expect(isWeekend('2026-09-05')).toBe(true); // sábado
    expect(isWeekend('2026-09-06')).toBe(true); // domingo
    expect(isWeekend('2026-09-07')).toBe(false); // segunda
  });
});

describe('startOfWeekIso', () => {
  it('devolve a segunda-feira da semana', () => {
    expect(startOfWeekIso('2026-09-02')).toBe('2026-08-31');
  });

  it('trata domingo como fim da semana anterior', () => {
    expect(startOfWeekIso('2026-09-06')).toBe('2026-08-31');
  });
});

describe('toLocalDateTime', () => {
  it('combina data e horário no fuso local', () => {
    const result = toLocalDateTime('2026-09-02', '18:30');
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(30);
    expect(result.getDate()).toBe(2);
  });

  it('sem horário, assume o fim do dia', () => {
    // Uma tarefa sem hora marcada não pode vencer às 00:00 do próprio dia.
    const result = toLocalDateTime('2026-09-02', null);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });
});

describe('minutesOfDay', () => {
  it('converte horário de parede em minutos', () => {
    expect(minutesOfDay('00:00')).toBe(0);
    expect(minutesOfDay('09:30')).toBe(570);
    expect(minutesOfDay('23:59')).toBe(1439);
  });
});

describe('isValidIsoDate', () => {
  it('aceita o formato correto', () => {
    expect(isValidIsoDate('2026-09-02')).toBe(true);
  });

  it('recusa formato errado e data inexistente', () => {
    expect(isValidIsoDate('02/09/2026')).toBe(false);
    expect(isValidIsoDate('2026-9-2')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
  });
});

describe('formatRelativeDay', () => {
  const now = new Date(2026, 8, 2, 10, 0);

  it('nomeia os dias vizinhos', () => {
    expect(formatRelativeDay('2026-09-02', now)).toBe('Hoje');
    expect(formatRelativeDay('2026-09-03', now)).toBe('Amanhã');
    expect(formatRelativeDay('2026-09-01', now)).toBe('Ontem');
  });

  it('usa a data curta em português fora dessa janela', () => {
    // Cobre também a importação do locale ptBR do date-fns v4.
    expect(formatRelativeDay('2026-09-10', now)).toContain('set');
  });
});
