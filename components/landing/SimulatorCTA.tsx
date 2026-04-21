import Link from 'next/link';

export default function SimulatorCTA() {
  return (
    <section className="py-24 bg-[#1d65c5]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-sm font-semibold text-[#ade1ed] uppercase tracking-widest mb-4">Simulador solar</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Simula tu ahorro ahora
        </h2>
        <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Ingresa tu consumo o sube tu boleta eléctrica. En menos de 5 minutos sabrás cuánto puedes ahorrar,
          qué sistema te conviene y cuándo recuperas la inversión.
        </p>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
          <div className="grid grid-cols-3 gap-6 mb-8 text-center">
            {[
              { icon: '📄', label: 'Sube tu boleta o ingresa consumo' },
              { icon: '🧮', label: 'Simulación automática por región' },
              { icon: '📊', label: 'Ahorro, retorno y PFV recomendada' },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-3xl mb-2">{item.icon}</div>
                <p className="text-xs text-white/70 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/simulator"
            className="inline-flex items-center gap-2 bg-[#389fe0] hover:bg-[#70caca] text-white font-bold py-4 px-10 rounded-xl text-base transition-colors"
          >
            Iniciar simulación gratuita →
          </Link>
          <p className="text-white/40 text-xs mt-3">Sin registro · Sin compromiso · Resultado inmediato</p>
        </div>
      </div>
    </section>
  );
}
