import Link from 'next/link';
import { getPurchaseInvoices, getReceiptSignedUrl } from '@/lib/db/expenses';
import { getPurchaseAccounts, getDefaultAccountId } from '@/lib/db/accounts';
import { getSalesInvoicesWithPago, getSalesInvoiceDocSignedUrl } from '@/lib/db/sales';
import { getConciliacion } from '@/lib/db/sii';
import { getProjects } from '@/lib/db/projects';
import ComprasTab from '@/components/admin/ComprasTab';
import CobranzaTab from '@/components/admin/CobranzaTab';
import SalesInvoicesManager from '@/components/admin/SalesInvoicesManager';
import ConciliacionView from '@/components/admin/ConciliacionView';

export const metadata = { title: 'Facturas' };

type Tab = 'compras' | 'ventas' | 'cobranza' | 'conciliacion';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'compras',      label: 'Compras' },
  { key: 'ventas',       label: 'Ventas' },
  { key: 'cobranza',     label: 'Cobranza' },
  { key: 'conciliacion', label: 'Conciliación SII' },
];

const SUBTITULO: Record<Tab, string> = {
  compras:      'Sube el XML de cada factura que recibes y clasifícala. El proyecto es opcional y se asigna después.',
  ventas:       'Documentos de venta emitidos — de aquí sale el IVA débito del F29.',
  cobranza:     'Estado de pago de lo emitido. Los avisos salen solos por correo al acercarse el vencimiento.',
  conciliacion: 'Cruza tus registros contra el RCV del SII, documento por documento, antes de declarar.',
};

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : 'compras';

  const now = new Date();
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)
    ? sp.mes
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [y, m] = mes.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  const href = (t: Tab) => `/admin/facturas?tab=${t}&mes=${mes}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 pt-4">
        <h1 className="text-lg font-bold text-gray-900">Facturas</h1>
        <p className="text-xs text-gray-400 mt-0.5">{SUBTITULO[tab]}</p>
        <nav className="flex gap-1 mt-3 -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <Link key={t.key} href={href(t.key)}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-[#1d65c5] text-[#1d65c5]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="px-4 sm:px-6 py-6">
        {tab === 'compras'      && <ComprasPanel mes={mes} label={label} />}
        {tab === 'ventas'       && <VentasPanel />}
        {tab === 'cobranza'     && <CobranzaPanel />}
        {tab === 'conciliacion' && <ConciliacionPanel mes={mes} label={label} />}
      </div>
    </div>
  );
}

// ─── Paneles (cada uno carga solo lo suyo) ───────────────────────────────────

async function ComprasPanel({ mes, label }: { mes: string; label: string }) {
  const [rows, accounts, defaultAccountId] = await Promise.all([
    getPurchaseInvoices({ periodo: mes }),
    getPurchaseAccounts(),
    getDefaultAccountId(),
  ]);

  // URL firmada del respaldo (XML del DTE o la imagen), bucket privado.
  const withUrls = await Promise.all(rows.map(async (r) => ({
    ...r,
    docUrl: r.xml_path
      ? await getReceiptSignedUrl(r.xml_path)
      : r.image_path ? await getReceiptSignedUrl(r.image_path) : null,
  })));

  return (
    <div className="flex flex-col gap-4">
      <MesNav mes={mes} label={label} tab="compras" />
      <ComprasTab rows={withUrls} accounts={accounts} periodo={label} defaultAccountId={defaultAccountId ?? ''} />
    </div>
  );
}

async function VentasPanel() {
  const [invoices, projects] = await Promise.all([getSalesInvoicesWithPago(), getProjects()]);

  const withUrls = await Promise.all(invoices.map(async (inv) => ({
    ...inv,
    signedUrl: inv.image_path ? await getSalesInvoiceDocSignedUrl(inv.image_path) : null,
  })));

  const projectOpts = projects
    .filter((p) => p.estado !== 'cancelado')
    .map((p) => ({ id: p.id, nombre: p.nombre, client_name: p.client_name }));

  return <SalesInvoicesManager invoices={withUrls} projects={projectOpts} />;
}

async function CobranzaPanel() {
  const invoices = await getSalesInvoicesWithPago();
  return <CobranzaTab invoices={invoices} />;
}

async function ConciliacionPanel({ mes, label }: { mes: string; label: string }) {
  const [conciliacion, accounts] = await Promise.all([
    getConciliacion(mes),
    getPurchaseAccounts(),
  ]);
  return <ConciliacionView conciliacion={conciliacion} mes={mes} label={label} accounts={accounts} />;
}

// Navegador de mes compartido por las pestañas que trabajan por período.
function MesNav({ mes, label, tab }: { mes: string; label: string; tab: string }) {
  const shift = (delta: number) => {
    const [y, m] = mes.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `/admin/facturas?tab=${tab}&mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  return (
    <div className="flex items-center gap-2">
      <Link href={shift(-1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">←</Link>
      <span className="text-sm font-semibold text-gray-900 capitalize min-w-[9rem] text-center">{label}</span>
      <Link href={shift(1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">→</Link>
    </div>
  );
}
