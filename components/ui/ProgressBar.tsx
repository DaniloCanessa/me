import type { WizardStep } from '@/lib/types';

const STEP_LABELS: Record<WizardStep, string> = {
  'customer-type':       'Tipo',
  'contact':             'Contacto',
  'supply':              'Suministro',
  'bills':               'Boletas',
  'bill-review':         'Revisión',
  'future-consumption':  'Futuro',
  'results':             'Resultado',
};

const STEP_ORDER: WizardStep[] = [
  'customer-type',
  'contact',
  'supply',
  'bills',
  'bill-review',
  'future-consumption',
  'results',
];

interface ProgressBarProps {
  currentStep: WizardStep;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {STEP_ORDER.map((step, index) => {
            const isDone    = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step} className="flex items-center flex-1">
                {/* Círculo del paso */}
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                      isDone    ? 'bg-[#389fe0] text-white'                       : '',
                      isCurrent ? 'bg-[#389fe0] text-white ring-2 ring-[#389fe0]/30' : '',
                      !isDone && !isCurrent ? 'bg-gray-100 text-gray-400'         : '',
                    ].join(' ')}
                  >
                    {isDone ? '✓' : index + 1}
                  </div>
                  <span
                    className={[
                      'text-[10px] mt-1 hidden sm:block',
                      isCurrent ? 'text-[#1d65c5] font-semibold' : 'text-gray-400',
                    ].join(' ')}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>

                {/* Línea conectora */}
                {index < STEP_ORDER.length - 1 && (
                  <div
                    className={[
                      'flex-1 h-0.5 mx-1 mb-4 sm:mb-3 rounded transition-colors',
                      index < currentIndex ? 'bg-[#389fe0]/80' : 'bg-gray-200',
                    ].join(' ')}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
