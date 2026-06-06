'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface MapMarker {
  /** Posición horizontal sobre la imagen del mapa, en %. */
  x: number;
  /** Posición vertical sobre la imagen del mapa, en %. */
  y: number;
  location: string;
  title: string;
}

/**
 * Mapa de Chile con marcadores interactivos sobre las ubicaciones de los
 * proyectos. Hover (o tap en móvil) muestra un tooltip con el proyecto.
 */
export default function ProjectsMap({ markers }: { markers: MapMarker[] }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="bg-white p-4 rounded-2xl">
      <div className="relative">
        <Image
          src="/images/pais-con-proyectos.png"
          alt="Proyectos Mercado Energy en Chile"
          width={500}
          height={600}
          className="w-full h-auto object-contain"
        />

        {markers.map((m, i) => {
          const isActive = active === i;
          // Cerca del borde superior el tooltip se muestra hacia abajo.
          const tooltipBelow = m.y < 18;
          return (
            <button
              key={`${m.location}-${i}`}
              type="button"
              aria-label={`${m.title} — ${m.location}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${m.x}%`, top: `${m.y}%`, zIndex: isActive ? 30 : 10 }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(isActive ? null : i)}
            >
              <span className="relative flex w-4 h-4">
                <span
                  className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-[#389fe0] opacity-40"
                  style={{ animationDuration: '2.2s', animationDelay: `${(i % 5) * 0.35}s` }}
                />
                <span
                  className={`relative inline-flex rounded-full w-4 h-4 border-2 border-white shadow-md transition-colors duration-200 ${
                    isActive ? 'bg-[#1d65c5]' : 'bg-[#389fe0]'
                  }`}
                />
              </span>

              {isActive && (
                <span
                  className={`absolute left-1/2 -translate-x-1/2 w-52 bg-[#010101] text-white text-left rounded-xl px-3.5 py-2.5 shadow-xl pointer-events-none ${
                    tooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                  }`}
                >
                  <span className="block text-[10px] font-semibold text-[#70caca] uppercase tracking-wider">
                    {m.location}
                  </span>
                  <span className="block text-xs font-medium leading-snug mt-0.5">{m.title}</span>
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent ${
                      tooltipBelow ? 'bottom-full border-b-[#010101]' : 'top-full border-t-[#010101]'
                    }`}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-gray-400 mt-2">
        Pasa el cursor sobre los puntos azules para ver cada proyecto
      </p>
    </div>
  );
}
