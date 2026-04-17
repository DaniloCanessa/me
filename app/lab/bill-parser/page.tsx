import BillParser from '@/components/lab/BillParser';

export const metadata = { title: 'Lab — Lector de Boletas · Mercado Energy' };

export default function BillParserPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Experimental
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Lector de boletas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sube una foto o PDF de tu boleta eléctrica. El sistema extraerá los datos y te los mostrará para que los revises antes de confirmar.
          </p>
        </div>

        {/* Componente principal */}
        <BillParser />

        {/* Footer */}
        <p className="text-xs text-gray-300 text-center mt-8">
          Mercado Energy · Fase experimental · Los datos no se guardan
        </p>
      </div>
    </main>
  );
}
