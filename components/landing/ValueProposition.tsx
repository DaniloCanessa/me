const VALUES = [
  {
    icon: '📊',
    title: 'Análisis con tus boletas reales',
    description: 'Calculamos con tu consumo histórico real, no con promedios genéricos. El simulador lee tu boleta automáticamente.',
  },
  {
    icon: '📋',
    title: 'Conocemos la regulación chilena',
    description: 'Aplicamos el DFL 4 y la normativa de net billing vigente. Sabes exactamente qué puedes inyectar y qué recibes a cambio.',
  },
  {
    icon: '🔋',
    title: 'Solución energética completa',
    description: 'No solo paneles. Diseñamos sistemas con baterías, gestión de demanda y climatización según tus necesidades.',
  },
  {
    icon: '📍',
    title: 'Presencia en todo Chile',
    description: 'Con proyectos ejecutados desde Arica hasta Magallanes, calibramos la producción solar real de tu región.',
  },
  {
    icon: '🤝',
    title: 'Enfoque personalizado',
    description: 'Cada proyecto es único. Trabajamos contigo desde la simulación hasta la puesta en marcha y el soporte post-venta.',
  },
  {
    icon: '⚙️',
    title: 'Equipos certificados',
    description: 'Trabajamos con las marcas líderes del mercado. Garantía de 25 años en producción y soporte técnico permanente.',
  },
];

export default function ValueProposition() {
  return (
    <section className="py-24 bg-[#dde3e9]/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Por qué elegirnos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#010101]">¿Por qué Mercado Energy?</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Unimos experiencia, innovación y compromiso con la sostenibilidad para darte soluciones que generan impacto real.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="bg-white rounded-2xl p-6 border border-[#b0cedd]/40 hover:border-[#389fe0] hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-4">{v.icon}</div>
              <h3 className="text-base font-bold text-[#010101] mb-2">{v.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
