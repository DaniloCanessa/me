import Link from 'next/link';
import Navbar from './Navbar';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col">
      <style>{`
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-in { opacity: 0; animation: hero-in 0.8s ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .hero-in { opacity: 1; animation: none; }
        }
      `}</style>

      <Navbar variant="transparent" />

      {/* Background */}
      <div className="absolute inset-0 bg-[#010101] overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src="/videos/video-poroma.mp4" type="video/mp4" />
        </video>
        {/* Capas de gradiente para profundidad y contraste */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#010101] via-[#010101]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#010101] via-transparent to-[#010101]/30" />
        <div className="absolute -top-1/3 -right-1/4 w-[40rem] h-[40rem] bg-[#1d65c5]/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-32 w-full">
          <div className="max-w-2xl">
            <h1 className="hero-in text-5xl md:text-[4.2rem] font-bold text-white leading-[1.05] tracking-tight mb-6" style={{ animationDelay: '0.2s' }}>
              Reduce tu cuenta<br />de luz. Invierte en<br />
              <span className="bg-gradient-to-r from-[#389fe0] to-[#70caca] bg-clip-text text-transparent">energía propia.</span>
            </h1>

            <p className="hero-in text-lg text-white/65 mb-10 leading-relaxed max-w-xl" style={{ animationDelay: '0.32s' }}>
              Diseñamos sistemas solares a medida para hogares y empresas en Chile.
              Simula tu ahorro en minutos — sin compromiso.
            </p>

            <div className="hero-in flex flex-col sm:flex-row gap-4" style={{ animationDelay: '0.44s' }}>
              <Link
                href="/simulator"
                className="inline-flex items-center justify-center gap-2 bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-4 px-8 rounded-xl text-base shadow-lg shadow-[#389fe0]/30 hover:shadow-xl hover:shadow-[#389fe0]/40 hover:-translate-y-0.5 transition-all duration-300"
              >
                Simula tu proyecto →
              </Link>
              <Link
                href="/proyectos"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold py-4 px-8 rounded-xl text-base transition-all duration-300"
              >
                Ver proyectos →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-3 gap-4 text-center">
          {[
            { value: '+200', label: 'proyectos ejecutados' },
            { value: '+25', label: 'localidades en Chile' },
            { value: '100%', label: 'soluciones a medida' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#389fe0] to-[#70caca] bg-clip-text text-transparent">{s.value}</div>
              <div className="text-xs md:text-sm text-white/60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
