'use client';

import dynamic from 'next/dynamic';
import type { SimulatorResult } from '@/lib/types';

// PDFDownloadLink no puede correr en el servidor
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false },
);

const SimulationPDFDocument = dynamic(
  () => import('./SimulationPDF'),
  { ssr: false },
);

interface PDFDownloadButtonProps {
  result: SimulatorResult;
  clientName: string;
  scenario?: string;
}

export default function PDFDownloadButton({ result, clientName, scenario }: PDFDownloadButtonProps) {
  const fileName = `simulacion-solar-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <SimulationPDFDocument
          result={result}
          clientName={clientName}
          scenario={scenario}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <button
          type="button"
          disabled={loading}
          className="w-full rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-semibold py-3 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Descargar informe PDF
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
}
