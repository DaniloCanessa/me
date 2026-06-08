import Reveal from './Reveal';
import { IconMonitor, IconRuler, IconZap } from './icons';

const STEPS = [
  {
    number: '01',
    Icon: IconMonitor,
    title: 'Simula en minutos',
    description: 'Ingresa tu consumo mensual o sube tu boleta eléctrica. Nuestro simulador calcula el sistema ideal para tu región y perfil de consumo.',
  },
  {
    number: '02',
    Icon: IconRuler,
    title: 'Diseño a medida',
    description: 'Un especialista analiza tu simulación y te presenta una propuesta técnica y financiera personalizada, sin costo ni compromiso.',
  },
  {
    number: '03',
    Icon: IconZap,
    title: 'Instalación y soporte',
    description: 'Instalamos tu sistema con equipos certificados y te acompañamos durante toda la vida útil del proyecto.',
  },
];

export default function HowItWorks() {
  return (
    <section className="pt-28 pb-16 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <p className="text-xs font-semibold text-[#389fe0] uppercase tracking-[0.2em] mb-4">Proceso</p>
          <h2 className="text-3xl md:text-[2.6rem] font-bold text-[#010101] tracking-tight leading-tight">
            Tres pasos para tu sistema solar
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-10 md:gap-8 relative">
          {/* Línea conectora desktop */}
          <div className="hidden md:block absolute top-12 h-px bg-gradient-to-r from-transparent via-[#b0cedd] to-transparent" style={{ left: '16.5%', right: '16.5%' }} />

          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 120}>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-7">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#389fe0]/10 to-[#b0cedd]/20 ring-1 ring-[#b0cedd]/50 flex items-center justify-center text-[#1d65c5] shadow-sm">
                    <step.Icon className="w-10 h-10" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#389fe0] text-white text-xs font-bold flex items-center justify-center shadow-md shadow-[#389fe0]/30">
                    {step.number.slice(1)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#010101] mb-3 tracking-tight">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
