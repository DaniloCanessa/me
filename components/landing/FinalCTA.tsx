import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="py-24 bg-[#1d65c5] relative overflow-hidden">
      {/* Decoración */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#389fe0]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#70caca]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <p className="text-sm font-semibold text-[#ade1ed] uppercase tracking-widest mb-4">Da el primer paso</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
          ¿Listo para generar<br />tu propia energía?
        </h2>
        <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
          Simula en 5 minutos. Sin registro. Sin compromiso.
          Un especialista te contactará con tu propuesta a medida.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/simulator"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#ade1ed] text-[#1d65c5] font-bold py-4 px-10 rounded-xl text-base transition-colors"
          >
            Simular mi ahorro →
          </Link>
          <a
            href="mailto:contacto@mercadoenergy.cl"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-4 px-10 rounded-xl text-base transition-colors"
          >
            Contactar un especialista
          </a>
        </div>
      </div>
    </section>
  );
}
