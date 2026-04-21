import type { CustomerCategory } from '@/lib/types';

interface StepCustomerTypeProps {
  selected: CustomerCategory | null;
  onSelect: (category: CustomerCategory) => void;
}

const OPTIONS: {
  value: CustomerCategory;
  title: string;
  description: string;
  icon: string;
  examples: string;
}[] = [
  {
    value: 'natural',
    title: 'Residencial',
    description: 'Quiero instalar paneles solares en mi hogar.',
    icon: '🏠',
    examples: 'Casa, departamento, segunda vivienda',
  },
  {
    value: 'business',
    title: 'Empresa y grandes consumidores',
    description: 'Quiero instalar un sistema solar en mis instalaciones.',
    icon: '🏢',
    examples: 'Oficina, colegio, industria, condominio',
  },
];

export default function StepCustomerType({ selected, onSelect }: StepCustomerTypeProps) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">¿Quién eres?</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Selecciona tu perfil para personalizar la simulación.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={[
                'text-left p-6 rounded-2xl border-2 transition-all',
                'hover:border-[#389fe0] hover:shadow-sm',
                isSelected
                  ? 'border-[#389fe0] bg-[#dde3e9]/50 shadow-sm'
                  : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <div className="text-4xl mb-4">{opt.icon}</div>
              <h2 className="text-lg font-semibold text-gray-900">{opt.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
              <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-3">
                {opt.examples}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
