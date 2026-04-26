'use client';

import { useState, useCallback, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { importProducts, type ImportRow } from '@/app/admin/products/import/actions';

// ─── Categorías y tipos válidos ───────────────────────────────────────────────

const VALID_CATEGORIES = [
  'solar_kit', 'panel', 'inverter', 'microinverter', 'charge_controller',
  'battery', 'charger', 'ev_charger', 'pump', 'dc_converter', 'lighting',
  'ac', 'accessory',
];

const CATEGORY_ALIASES: Record<string, string> = {
  'kit solar': 'solar_kit', 'kit': 'solar_kit',
  'panel solar': 'panel', 'panel': 'panel', 'paneles': 'panel',
  'inversor': 'inverter', 'inverter': 'inverter', 'inversores': 'inverter',
  'microinversor': 'microinverter', 'microinverter': 'microinverter',
  'regulador': 'charge_controller', 'charge controller': 'charge_controller', 'regulador de carga': 'charge_controller',
  'bateria': 'battery', 'batería': 'battery', 'battery': 'battery', 'baterias': 'battery',
  'cargador': 'charger', 'charger': 'charger',
  'cargador ev': 'ev_charger', 'ev charger': 'ev_charger', 'ev': 'ev_charger',
  'bomba': 'pump', 'pump': 'pump', 'bomba de agua': 'pump',
  'conversor': 'dc_converter', 'dc converter': 'dc_converter',
  'iluminacion': 'lighting', 'iluminación': 'lighting', 'lighting': 'lighting',
  'aire acondicionado': 'ac', 'ac': 'ac',
  'accesorio': 'accessory', 'accesorios': 'accessory', 'accessory': 'accessory',
};

const CUSTOMER_ALIASES: Record<string, string> = {
  'residencial': 'residential', 'residential': 'residential',
  'empresa': 'business', 'business': 'business', 'comercial': 'business',
  'ambos': 'both', 'both': 'both', 'todos': 'both',
};

// ─── Mapeo de columnas ────────────────────────────────────────────────────────

type FieldKey =
  | 'name' | 'sku' | 'category' | 'customer_type'
  | 'costo_proveedor_clp' | 'margen_pct' | 'base_price_clp' | 'installation_price_clp'
  | 'stock' | 'is_active' | 'sort_order' | 'notes' | '(ignorar)';

const FIELD_OPTIONS: { value: FieldKey; label: string; required?: boolean }[] = [
  { value: 'name',                   label: 'Nombre',              required: true },
  { value: 'sku',                    label: 'SKU / Código',        required: true },
  { value: 'category',              label: 'Categoría',           required: true },
  { value: 'customer_type',         label: 'Tipo cliente'         },
  { value: 'costo_proveedor_clp',   label: 'Costo proveedor $'    },
  { value: 'margen_pct',            label: 'Margen %'             },
  { value: 'base_price_clp',        label: 'Precio base $'        },
  { value: 'installation_price_clp',label: 'Precio instalación $' },
  { value: 'stock',                 label: 'Stock'                },
  { value: 'is_active',             label: 'Activo (true/false)'  },
  { value: 'sort_order',            label: 'Orden'                },
  { value: 'notes',                 label: 'Notas'                },
  { value: '(ignorar)',             label: '— Ignorar columna —'  },
];

const COLUMN_AUTO_MAP: Record<string, FieldKey> = {
  nombre: 'name', name: 'name', producto: 'name', descripcion: 'name', descripción: 'name',
  sku: 'sku', codigo: 'sku', código: 'sku', code: 'sku', ref: 'sku', referencia: 'sku',
  categoria: 'category', categoría: 'category', category: 'category', tipo: 'category',
  tipo_cliente: 'customer_type', customer_type: 'customer_type', cliente: 'customer_type',
  costo: 'costo_proveedor_clp', costo_proveedor: 'costo_proveedor_clp', costo_proveedor_clp: 'costo_proveedor_clp',
  margen: 'margen_pct', margen_pct: 'margen_pct', margin: 'margen_pct',
  precio: 'base_price_clp', precio_base: 'base_price_clp', base_price_clp: 'base_price_clp', price: 'base_price_clp',
  instalacion: 'installation_price_clp', instalación: 'installation_price_clp', installation_price_clp: 'installation_price_clp',
  stock: 'stock', cantidad: 'stock', inventory: 'stock',
  activo: 'is_active', is_active: 'is_active', active: 'is_active',
  orden: 'sort_order', sort_order: 'sort_order', order: 'sort_order',
  notas: 'notes', notes: 'notes', nota: 'notes', comentario: 'notes',
};

function autoMap(header: string): FieldKey {
  const key = header.toLowerCase().trim().replace(/\s+/g, '_');
  return COLUMN_AUTO_MAP[key] ?? '(ignorar)';
}

// ─── Parsing y normalización ──────────────────────────────────────────────────

function normalizeCategory(raw: string): string {
  const key = raw.toLowerCase().trim();
  return CATEGORY_ALIASES[key] ?? (VALID_CATEGORIES.includes(key) ? key : 'accessory');
}

function normalizeCustomerType(raw: string): string {
  const key = raw.toLowerCase().trim();
  return CUSTOMER_ALIASES[key] ?? 'both';
}

function parseBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  const s = String(raw).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes' || s === 'activo';
}

function parseNum(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  return parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0;
}

// ─── Plantilla descargable ────────────────────────────────────────────────────

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['nombre', 'sku', 'categoria', 'tipo_cliente', 'costo', 'margen', 'precio_base', 'instalacion', 'stock', 'activo', 'notas'],
    ['Panel Solar 550W', 'PS-550W', 'panel', 'ambos', 85000, 30, '', 0, 10, 'true', 'Panel monocristalino'],
    ['Kit Solar 3kWp', 'KIT-3KWP', 'solar_kit', 'residencial', 950000, 35, '', 250000, 3, 'true', ''],
    ['Mano de obra', 'MO-INST', 'accessory', 'ambos', 0, 0, 120000, 0, 999, 'true', 'Servicio instalación'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, 'plantilla_productos.xlsx');
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

export default function ProductImporter() {
  const [sheet, setSheet]       = useState<ParsedSheet | null>(null);
  const [mapping, setMapping]   = useState<Record<string, FieldKey>>({});
  const [result, setResult]     = useState<{ inserted: number; updated: number; errors: { sku: string; message: string }[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isPending, start]      = useTransition();
  const [fileName, setFileName] = useState('');

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (!json.length) return;
      const headers = Object.keys(json[0]);
      const initialMapping: Record<string, FieldKey> = {};
      headers.forEach((h) => { initialMapping[h] = autoMap(h); });
      setMapping(initialMapping);
      setSheet({ headers, rows: json });
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  function buildRows(): ImportRow[] {
    if (!sheet) return [];
    return sheet.rows.map((raw) => {
      const get = (field: FieldKey) => {
        const col = Object.entries(mapping).find(([, v]) => v === field)?.[0];
        return col ? raw[col] : undefined;
      };

      const categoryRaw = String(get('category') ?? '');
      const customerRaw = String(get('customer_type') ?? '');

      return {
        name:                   String(get('name') ?? '').trim(),
        sku:                    String(get('sku') ?? '').trim(),
        category:               normalizeCategory(categoryRaw),
        customer_type:          customerRaw ? normalizeCustomerType(customerRaw) : 'both',
        costo_proveedor_clp:    parseNum(get('costo_proveedor_clp')),
        margen_pct:             get('margen_pct') !== undefined && get('margen_pct') !== ''
                                  ? parseNum(get('margen_pct')) : null,
        base_price_clp:         parseNum(get('base_price_clp')),
        installation_price_clp: parseNum(get('installation_price_clp')),
        stock:                  Math.round(parseNum(get('stock'))),
        is_active:              get('is_active') !== undefined ? parseBool(get('is_active')) : true,
        sort_order:             Math.round(parseNum(get('sort_order'))),
        notes:                  get('notes') ? String(get('notes')).trim() || null : null,
      };
    }).filter((r) => r.name && r.sku);
  }

  const preview = sheet ? buildRows().slice(0, 8) : [];
  const totalValid = sheet ? buildRows().length : 0;

  const requiredMapped = ['name', 'sku', 'category'].every((f) =>
    Object.values(mapping).includes(f as FieldKey)
  );

  function handleImport() {
    const rows = buildRows();
    if (!rows.length) return;
    start(async () => {
      const res = await importProducts(rows);
      setResult(res);
    });
  }

  function reset() {
    setSheet(null);
    setMapping({});
    setResult(null);
    setFileName('');
  }

  // ── Resultado final ──
  if (result) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="text-4xl mb-4">{result.errors.length === 0 ? '✅' : '⚠️'}</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Importación completada</h2>
        <p className="text-sm text-gray-500 mb-6">
          {result.inserted} producto{result.inserted !== 1 ? 's' : ''} procesado{result.inserted !== 1 ? 's' : ''}.
          {result.errors.length > 0 && ` ${result.errors.length} con error.`}
        </p>
        {result.errors.length > 0 && (
          <div className="text-left bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-xs space-y-1">
            {result.errors.map((e, i) => (
              <p key={i} className="text-red-600"><span className="font-mono font-semibold">{e.sku}</span>: {e.message}</p>
            ))}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Importar otro archivo
          </button>
          <a href="/admin/products"
            className="px-4 py-2 rounded-xl bg-[#389fe0] hover:bg-[#1d65c5] text-white text-sm font-semibold transition-colors">
            Ver catálogo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Drop zone */}
      {!sheet && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${
            dragOver ? 'border-[#389fe0] bg-blue-50/40' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="text-4xl mb-4">📂</div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Arrastra tu archivo aquí</p>
          <p className="text-xs text-gray-400 mb-6">Soporta .xlsx, .xls y .csv</p>
          <label className="cursor-pointer inline-block bg-[#389fe0] hover:bg-[#1d65c5] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            Seleccionar archivo
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
          </label>
          <div className="mt-6">
            <button onClick={downloadTemplate}
              className="text-xs text-[#389fe0] hover:underline">
              Descargar plantilla de ejemplo →
            </button>
          </div>
        </div>
      )}

      {sheet && (
        <>
          {/* Header del archivo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{fileName}</p>
                <p className="text-xs text-gray-400">{sheet.rows.length} filas detectadas · {sheet.headers.length} columnas</p>
              </div>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ✕ Cambiar archivo
            </button>
          </div>

          {/* Mapeo de columnas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Mapeo de columnas</p>
              <p className="text-xs text-gray-400 mt-0.5">Indica qué representa cada columna de tu archivo.</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sheet.headers.map((h) => (
                <div key={h} className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide truncate" title={h}>{h}</span>
                  <select
                    value={mapping[h] ?? '(ignorar)'}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value as FieldKey }))}
                    className={`border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#389fe0] ${
                      mapping[h] === '(ignorar)' ? 'border-gray-200 text-gray-400' : 'border-[#389fe0]/40 text-gray-800'
                    }`}
                  >
                    {FIELD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}{o.required ? ' *' : ''}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!requiredMapped && (
              <p className="px-5 pb-4 text-xs text-amber-600">
                ⚠ Debes mapear las columnas obligatorias: Nombre *, SKU / Código *, Categoría *
              </p>
            )}
          </div>

          {/* Preview */}
          {totalValid > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  Vista previa <span className="text-gray-400 font-normal">({totalValid} productos válidos)</span>
                </p>
                {totalValid > 8 && <p className="text-xs text-gray-400">Mostrando primeros 8</p>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-left">
                      <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">Nombre</th>
                      <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">SKU</th>
                      <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">Categoría</th>
                      <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-right">Costo</th>
                      <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-right">Precio base</th>
                      <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-center">Stock</th>
                      <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-center">Activo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40">
                        <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{r.name}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-500">{r.sku}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.category}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                          {r.costo_proveedor_clp > 0 ? r.costo_proveedor_clp.toLocaleString('es-CL') : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                          {r.base_price_clp > 0 ? r.base_price_clp.toLocaleString('es-CL') : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-gray-500">{r.stock}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {r.is_active ? 'Sí' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botón importar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Si el SKU ya existe en el catálogo, se actualizará el producto.
            </p>
            <button
              onClick={handleImport}
              disabled={isPending || !requiredMapped || totalValid === 0}
              className="bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {isPending ? 'Importando…' : `Importar ${totalValid} producto${totalValid !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

    </div>
  );
}
