'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createExpenseCapture } from '@/app/admin/gastos/actions';

type ProjectOpt = { id: string; nombre: string };

// Comprime la foto en el navegador: la achica a máx. 1600 px y la reencoda a
// JPEG. Las fotos de celular pesan varios MB y excederían el límite de los
// Server Actions; comprimida queda <1 MB y el OCR la lee igual de bien.
// Los PDF u otros formatos se dejan tal cual.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.72));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export default function CaptureExpenseForm({ projects }: { projects: ProjectOpt[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [projectSel, setProjectSel] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [isPending, start] = useTransition();

  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function cancel() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/admin/gastos');
  }

  function pick(f: File | null) {
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!file) { setError('Primero toma o elige una foto de la boleta'); return; }
    setError(null);
    const toUpload = await compressImage(file);
    const fd = new FormData();
    fd.set('file', toUpload);
    fd.set('project_select', projectSel);
    fd.set('notas', notas);
    start(async () => {
      try {
        const res = await createExpenseCapture(fd);
        if (res?.error) { setError(res.error); return; }
        // Listo para cargar otra
        pick(null);
        setNotas('');
        setProjectSel('');
        if (cameraRef.current) cameraRef.current.value = '';
        if (galleryRef.current) galleryRef.current.value = '';
        setDoneCount((n) => n + 1);
      } catch (e) {
        setError('No se pudo enviar: ' + (e instanceof Error ? e.message : 'error inesperado'));
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">
      {doneCount > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          ✓ Gasto enviado a la bandeja de revisión ({doneCount} en esta sesión). Puedes cargar otro.
        </div>
      )}

      {/* Imagen */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Boleta / factura</p>

        {previewUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Previsualización" className="w-full rounded-xl border border-gray-100 max-h-80 object-contain bg-gray-50" />
            <button onClick={() => pick(null)}
              className="absolute top-2 right-2 bg-white/90 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-white">
              Cambiar
            </button>
          </div>
        ) : file ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            {file.name} <button onClick={() => pick(null)} className="ml-2 text-[#389fe0] underline">Quitar</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm text-gray-600 hover:border-[#389fe0] hover:text-[#1d65c5] transition-colors">
              <span className="text-2xl">📷</span> Tomar foto
            </button>
            <button onClick={() => galleryRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm text-gray-600 hover:border-[#389fe0] hover:text-[#1d65c5] transition-colors">
              <span className="text-2xl">🖼️</span> Elegir de galería
            </button>
          </div>
        )}

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <input ref={galleryRef} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </div>

      {/* Proyecto */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Proyecto</label>
          <select value={projectSel} onChange={(e) => setProjectSel(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#389fe0]">
            <option value="">— Decidir al revisar —</option>
            <option value="__sin__">Sin proyecto (gasto general)</option>
            <optgroup label="Proyectos">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </optgroup>
          </select>
          <p className="text-xs text-gray-400 mt-1">Si no sabes a qué proyecto va, déjalo en "Decidir al revisar".</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nota (opcional)</label>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: materiales eléctricos"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={cancel} disabled={isPending}
          className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50">
          Cancelar
        </button>
        <button onClick={submit} disabled={isPending || !file}
          className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
          {isPending ? 'Enviando…' : 'Enviar a revisión'}
        </button>
      </div>
    </div>
  );
}
