import Link from 'next/link';

const SOLUTIONS = [
  {
    icon: '☀️',
    title: 'Energía Solar Fotovoltaica',
    description: 'Sistemas PFV residenciales y comerciales dimensionados a tu consumo real. Desde 1 kWp hasta 300 kWp bajo el régimen de net billing DFL 4.',
    color: 'from-amber-50 to-amber-100/50',
    border: 'border-amber-200',
  },
  {
    icon: '🔋',
    title: 'Almacenamiento con Baterías',
    description: 'Autonomía nocturna, respaldo ante cortes y reducción del cargo por demanda en tarifas BT4/AT. Soluciones modulares escalables.',
    color: 'from-[#b0cedd]/20 to-[#ade1ed]/20',
    border: 'border-[#b0cedd]',
  },
  {
    icon: '⚡',
    title: 'Optimización Energética',
    description: 'Análisis tarifario para encontrar la tarifa más conveniente. Gestión de demanda, eficiencia en iluminación y alumbrado público.',
    color: 'from-[#1d65c5]/5 to-[#389fe0]/10',
    border: 'border-[#389fe0]/30',
  },
  {
    icon: '❄️',
    title: 'Climatización',
    description: 'Cámaras de refrigeración móviles y sistemas de climatización de alta eficiencia integrados con generación solar.',
    color: 'from-[#70caca]/20 to-[#ade1ed]/20',
    border: 'border-[#70caca]',
  },
];

export default function Solutions() {
  return (
    <section id="soluciones" className="py-24 bg-[#010101]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Lo que hacemos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Nuestras soluciones</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            No solo instalamos paneles. Diseñamos soluciones energéticas integrales adaptadas a cada cliente.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {SOLUTIONS.map((s) => (
            <div
              key={s.title}
              className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl p-8 hover:scale-[1.01] transition-transform`}
            >
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/simulator"
            className="inline-flex items-center gap-2 bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-3 px-8 rounded-xl transition-colors"
          >
            Simular mi sistema ideal →
          </Link>
        </div>
      </div>
    </section>
  );
}
