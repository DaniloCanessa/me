const STEPS = [
  {
    number: '01',
    icon: '🖥️',
    title: 'Simula en minutos',
    description: 'Ingresa tu consumo mensual o sube tu boleta eléctrica. Nuestro simulador calcula el sistema ideal para tu región y perfil de consumo.',
  },
  {
    number: '02',
    icon: '📐',
    title: 'Diseño a medida',
    description: 'Un especialista analiza tu simulación y te presenta una propuesta técnica y financiera personalizada, sin costo ni compromiso.',
  },
  {
    number: '03',
    icon: '⚡',
    title: 'Instalación y soporte',
    description: 'Instalamos tu sistema con equipos certificados y te acompañamos durante toda la vida útil del proyecto.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Proceso</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#010101]">Tres pasos para tu sistema solar</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Línea conectora desktop */}
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-px bg-[#b0cedd]" style={{ left: '16.5%', right: '16.5%' }} />

          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-2xl bg-[#b0cedd]/20 border-2 border-[#b0cedd] flex items-center justify-center text-4xl">
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#389fe0] text-white text-xs font-bold flex items-center justify-center">
                  {step.number.slice(1)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#010101] mb-3">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
