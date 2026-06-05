// `wordmark: true` indica que el archivo es un logo horizontal completo
// (ya incluye el nombre), por lo que se muestra más ancho y sin texto al lado.
const BRANDS = [
  { name: 'Jinko Solar', file: 'jinko.png', wordmark: true },
  { name: 'LONGi', file: 'longi.png', wordmark: true },
  { name: 'SMA', file: 'sma.jpg', wordmark: true },
  { name: 'Huawei', file: 'huawei.png' },
  { name: 'Canadian Solar', file: 'canadian-solar.png' },
  { name: 'Victron Energy', file: 'victron.png' },
  { name: 'Pylontech', file: 'pylontech.ico' },
  { name: 'Dyness', file: 'dyness.ico' },
  { name: 'Livoltek', file: 'livoltek-logo.png', wordmark: true },
];

export default function Brands() {
  // Se renderiza la lista dos veces para lograr un scroll infinito sin saltos.
  const loop = [...BRANDS, ...BRANDS];

  return (
    <section className="py-16 bg-white border-y border-[#dde3e9] overflow-hidden">
      <style>{`
        @keyframes brand-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .brand-track {
          animation: brand-scroll 35s linear infinite;
        }
        .brand-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-track { animation: none; }
        }
      `}</style>

      <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-12 px-6">
        Trabajamos con las mejores marcas del mercado
      </p>

      {/* Marquee */}
      <div className="relative">
        {/* Difuminado en los bordes */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-white to-transparent" />

        <div className="flex w-max brand-track">
          {loop.map((brand, i) => (
            <div
              key={`${brand.name}-${i}`}
              className="flex items-center gap-3 mx-6 shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              aria-hidden={i >= BRANDS.length ? true : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/brands/${brand.file}`}
                alt={brand.name}
                className={brand.wordmark ? 'h-8 w-auto object-contain' : 'h-9 w-9 object-contain'}
              />
              {!brand.wordmark && (
                <span className="text-base font-bold text-[#1d65c5] whitespace-nowrap tracking-wide">
                  {brand.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
