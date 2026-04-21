import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Image src="/images/logotipo-2.png" alt="Mercado Energy" width={160} height={48} className="h-10 w-auto" />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white">
            <a href="#soluciones" className="hover:text-[#ade1ed] transition-colors">Soluciones</a>
            <a href="#proyectos" className="hover:text-[#ade1ed] transition-colors">Proyectos</a>
            <a href="#nosotros" className="hover:text-[#ade1ed] transition-colors">Nosotros</a>
            <a href="#contacto" className="hover:text-[#ade1ed] transition-colors">Contacto</a>
            <Link
              href="/simulator"
              className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-5 py-2 rounded-xl transition-colors"
            >
              Simular ahorro
            </Link>
          </div>
        </div>
      </nav>

      {/* Background */}
      <div className="absolute inset-0 bg-[#010101]">
        <Image
          src="/images/proyecto-coscaya.jpg"
          alt="Instalación solar Mercado Energy"
          fill
          className="object-cover opacity-40"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-[#ade1ed] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              ☀️ Energía solar inteligente para Chile
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Reduce tu cuenta<br />de luz. Invierte en<br />
              <span className="text-[#389fe0]">energía propia.</span>
            </h1>

            <p className="text-lg text-white/70 mb-10 leading-relaxed max-w-xl">
              Diseñamos sistemas solares a medida para hogares y empresas en Chile.
              Simula tu ahorro en minutos — sin compromiso.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/simulator"
                className="inline-flex items-center justify-center gap-2 bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-4 px-8 rounded-xl text-base transition-colors"
              >
                Simular mi ahorro →
              </Link>
              <a
                href="#proyectos"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold py-4 px-8 rounded-xl text-base transition-colors"
              >
                Ver proyectos ↓
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-3 gap-4 text-center">
          {[
            { value: '+200', label: 'proyectos ejecutados' },
            { value: '16', label: 'regiones de Chile' },
            { value: '25 años', label: 'vida útil garantizada' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold text-[#389fe0]">{s.value}</div>
              <div className="text-xs md:text-sm text-white/60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
