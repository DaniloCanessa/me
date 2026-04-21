'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { WizardState, KitScenarios, SimulatorResult } from '@/lib/types';
import SimulationReportHtml from './SimulationReportHtml';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  state: WizardState;
  scenarios?: KitScenarios;
  recommendedScenario?: 'A' | 'B' | 'C';
  businessResult?: SimulatorResult;
  clientName: string;
  clientEmail: string;
}

type EmailStatus = 'idle' | 'sending' | 'sent' | 'error';

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PDFDownloadButton({
  state, scenarios, recommendedScenario, businessResult, clientName, clientEmail,
}: Props) {
  const reportRef   = useRef<HTMLDivElement>(null);
  const pdfCache    = useRef<string | null>(null);
  const emailSent   = useRef(false);

  const [isOpen,       setIsOpen]       = useState(false);
  const [emailStatus,  setEmailStatus]  = useState<EmailStatus>('idle');
  const [downloading,  setDownloading]  = useState(false);

  // ── Genera el PDF como base64 (con caché) ──────────────────────────────────
  const generatePdf = useCallback(async (): Promise<string> => {
    if (pdfCache.current) return pdfCache.current;

    const [html2canvas, { jsPDF }] = await Promise.all([
      import('html2canvas').then((m) => m.default),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(reportRef.current!, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData   = canvas.toDataURL('image/png');
    const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW     = pdf.internal.pageSize.getWidth();
    const pageH     = pdf.internal.pageSize.getHeight();
    const imgW      = pageW;
    const imgH      = (canvas.height * pageW) / canvas.width;

    let heightLeft = imgH;
    let position   = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position  -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    const dataUri = pdf.output('datauristring');
    pdfCache.current = dataUri;
    return dataUri;
  }, []);

  // ── Envía el informe por email (una sola vez por ciclo de vida) ────────────
  const sendEmail = useCallback(async () => {
    if (emailSent.current) return;
    emailSent.current = true;
    setEmailStatus('sending');
    try {
      const dataUri  = await generatePdf();
      const base64   = dataUri.split(',')[1];
      const res = await fetch('/api/send-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, clientEmail, clientName }),
      });
      setEmailStatus(res.ok ? 'sent' : 'error');
    } catch {
      setEmailStatus('error');
    }
  }, [generatePdf, clientEmail, clientName]);

  // ── Dispara el email cuando abre el modal ──────────────────────────────────
  useEffect(() => {
    if (isOpen) sendEmail();
  }, [isOpen, sendEmail]);

  // ── Descarga el PDF desde el botón del modal ──────────────────────────────
  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const dataUri = await generatePdf();
      const link    = document.createElement('a');
      link.href     = dataUri;
      link.download = `simulacion-solar-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const emailLabel: Record<EmailStatus, string> = {
    idle:    '',
    sending: 'Enviando informe a tu correo...',
    sent:    `Informe enviado a ${clientEmail}`,
    error:   'No pudimos enviar el informe por email',
  };

  const emailColor: Record<EmailStatus, string> = {
    idle:    '#6b7280',
    sending: '#6b7280',
    sent:    '#16a34a',
    error:   '#b45309',
  };

  return (
    <>
      {/* ── Div off-screen para captura con html2canvas ───────────────────── */}
      <div
        style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 794 }}
        aria-hidden="true"
      >
        <div ref={reportRef}>
          <SimulationReportHtml
            state={state}
            scenarios={scenarios}
            recommendedScenario={recommendedScenario}
            businessResult={businessResult}
          />
        </div>
      </div>

      {/* ── Botón disparador ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border-2 border-gray-200 hover:border-[#b0cedd] bg-white text-gray-700 font-semibold py-3 text-sm transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Mostrar informe
      </button>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '24px 16px',
            overflowY: 'auto',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div
            style={{
              backgroundColor: '#fff', borderRadius: 12,
              maxWidth: 880, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              marginBottom: 24,
            }}
          >
            {/* Header sticky del modal */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid #e5e7eb',
                position: 'sticky', top: 0,
                backgroundColor: '#fff',
                borderRadius: '12px 12px 0 0',
                zIndex: 10,
              }}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: 0 }}>
                  Informe de simulación solar
                </p>
                {emailStatus !== 'idle' && (
                  <p style={{ fontSize: 11, color: emailColor[emailStatus], margin: '3px 0 0' }}>
                    {emailStatus === 'sending' && '⏳ '}
                    {emailStatus === 'sent'    && '✓ '}
                    {emailStatus === 'error'   && '⚠ '}
                    {emailLabel[emailStatus]}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#16a34a',
                    border: '1px solid #16a34a', borderRadius: 8,
                    padding: '6px 14px', backgroundColor: '#fff',
                    cursor: downloading ? 'not-allowed' : 'pointer',
                    opacity: downloading ? 0.5 : 1,
                  }}
                >
                  {downloading ? 'Generando...' : 'Descargar PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#6b7280',
                    border: '1px solid #e5e7eb', borderRadius: 8,
                    padding: '6px 14px', backgroundColor: '#fff', cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Contenido del informe */}
            <div style={{ padding: '0 20px 24px', overflowX: 'auto' }}>
              <SimulationReportHtml
                state={state}
                scenarios={scenarios}
                recommendedScenario={recommendedScenario}
                businessResult={businessResult}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
