import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { FailReason } from '../../../types/database.types';
import { useTaskStore } from '../../../store/useTaskStore';

interface Props {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

const FAIL_REASONS: { value: FailReason; label: string }[] = [
  { value: 'lack_of_time', label: 'Falta de tempo' },
  { value: 'tiredness', label: 'Cansaço físico/mental' },
  { value: 'forgot', label: 'Esqueci' },
  { value: 'lack_of_motivation', label: 'Falta de motivação' },
  { value: 'unexpected_event', label: 'Imprevisto' },
  { value: 'priority_changed', label: 'Prioridade mudou' },
  { value: 'procrastination', label: 'Procrastinação' },
  { value: 'external_problem', label: 'Problema externo' },
  { value: 'no_longer_necessary', label: 'Não era mais necessário' },
  { value: 'other', label: 'Outro' },
];

export function FailTaskModal({ taskId, isOpen, onClose }: Props) {
  const failTask = useTaskStore(state => state.failTask);
  const [reason, setReason] = useState<FailReason>('lack_of_time');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    failTask(taskId, reason, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-semibold text-neutral-900">Registrar Falha</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-neutral-600">
            O NoteFlow foca no aprendizado. Entender por que uma atividade não foi feita ajuda a identificar padrões e melhorar seu planejamento futuro.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Por que você não realizou essa atividade?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FAIL_REASONS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                    reason === r.value 
                      ? 'border-neutral-900 bg-neutral-900 text-white' 
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Observações adicionais (Opcional)</label>
            <textarea 
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="O que aconteceu?"
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              Confirmar Falha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
