import type { CustomerCategory } from '@/lib/types';
import type { SVGProps } from 'react';
import { IconHome, IconBuilding } from '@/components/landing/icons';

interface StepCustomerTypeProps {
  selected: CustomerCategory | null;
  onSelect: (category: CustomerCategory) => void;
}

const OPTIONS: {
  value: CustomerCategory;
  title: string;
  description: string;
  Icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  examples: string;
}[] = [
  {
    value: 'natural',
    title: 'Residencial',
    description: 'Quiero instalar paneles solares en mi hogar.',
    Icon: IconHome,
    examples: 'Casa, departamento, segunda vivienda',
  },
  {
    value: 'business',
    title: 'Empresa y grandes consumidores',
    description: 'Quiero instalar un sistema solar en mis instalaciones.',
    Icon: IconBuilding,
    examples: 'Oficina, colegio, industria, condominio',
  },
];

export default function StepCustomerType({ selected, onSelect }: StepCustomerTypeProps) {
  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-[#010101] tracking-tight">¿Quién eres?</h1>
        <p className="text-gray-500 mt-3">
          Selecciona tu perfil para personalizar la simulación.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={[
                'group text-left p-7 rounded-2xl ring-1 transition-all duration-300 hover:-translate-y-1',
                isSelected
                  ? 'ring-2 ring-[#389fe0] bg-[#389fe0]/5 shadow-[0_16px_48px_rgba(56,159,224,0.16)]'
                  : 'ring-[#b0cedd]/30 bg-white shadow-[0_1px_3px_rgba(16,40,80,0.04)] hover:shadow-[0_16px_48px_rgba(56,159,224,0.14)]',
              ].join(' ')}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#389fe0] to-[#1d65c5] text-white flex items-center justify-center shadow-lg shadow-[#389fe0]/25 mb-5">
                <opt.Icon className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#010101] tracking-tight">{opt.title}</h2>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{opt.description}</p>
              <p className="text-xs text-gray-400 mt-4 border-t border-[#b0cedd]/30 pt-3">
                {opt.examples}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
