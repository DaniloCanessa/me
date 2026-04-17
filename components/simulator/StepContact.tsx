'use client';

import { useState } from 'react';
import type { CustomerCategory, PersonContact, BusinessContact } from '@/lib/types';
import { REGIONS } from '@/lib/regions';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepContactProps {
  category: CustomerCategory;
  initialData: PersonContact | BusinessContact | null;
  onSubmit: (contact: PersonContact | BusinessContact) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
      />
    </div>
  );
}

function RegionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="regionId" className="text-sm font-medium text-gray-700">
        Región<span className="text-red-400 ml-0.5">*</span>
      </label>
      <select
        id="regionId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white"
      >
        <option value="">Selecciona tu región</option>
        {REGIONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Formulario persona natural ───────────────────────────────────────────────

function NaturalForm({
  initial,
  onSubmit,
}: {
  initial: PersonContact | null;
  onSubmit: (c: PersonContact) => void;
}) {
  const [form, setForm] = useState<PersonContact>({
    name: (initial as PersonContact)?.name ?? '',
    email: (initial as PersonContact)?.email ?? '',
    phone: (initial as PersonContact)?.phone ?? '',
    address: (initial as PersonContact)?.address ?? '',
    city: (initial as PersonContact)?.city ?? '',
    commune: (initial as PersonContact)?.commune ?? '',
    regionId: (initial as PersonContact)?.regionId ?? '',
  });

  function set(key: keyof PersonContact) {
    return (v: string) => setForm((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre completo" id="name" value={form.name} onChange={set('name')} placeholder="Juan Pérez" required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Correo electrónico" id="email" type="email" value={form.email} onChange={set('email')} placeholder="juan@ejemplo.cl" required />
        <Field label="Teléfono" id="phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+56 9 1234 5678" required />
      </div>
      <Field label="Dirección" id="address" value={form.address} onChange={set('address')} placeholder="Calle y número" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Ciudad" id="city" value={form.city} onChange={set('city')} placeholder="Santiago" />
        <Field label="Comuna" id="commune" value={form.commune} onChange={set('commune')} placeholder="Las Condes" />
      </div>
      <RegionSelect value={form.regionId} onChange={set('regionId')} />

      <button
        type="submit"
        className="mt-2 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-sm transition-colors"
      >
        Continuar →
      </button>
    </form>
  );
}

// ─── Formulario empresa ───────────────────────────────────────────────────────

function BusinessForm({
  initial,
  onSubmit,
}: {
  initial: BusinessContact | null;
  onSubmit: (c: BusinessContact) => void;
}) {
  const [form, setForm] = useState<BusinessContact>({
    companyName: (initial as BusinessContact)?.companyName ?? '',
    contactName: (initial as BusinessContact)?.contactName ?? '',
    email: (initial as BusinessContact)?.email ?? '',
    phone: (initial as BusinessContact)?.phone ?? '',
    address: (initial as BusinessContact)?.address ?? '',
    city: (initial as BusinessContact)?.city ?? '',
    commune: (initial as BusinessContact)?.commune ?? '',
    regionId: (initial as BusinessContact)?.regionId ?? '',
  });

  function set(key: keyof BusinessContact) {
    return (v: string) => setForm((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Razón social / Nombre empresa" id="companyName" value={form.companyName} onChange={set('companyName')} placeholder="Empresa S.A." required />
      <Field label="Nombre de contacto" id="contactName" value={form.contactName} onChange={set('contactName')} placeholder="María González" required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Correo electrónico" id="email" type="email" value={form.email} onChange={set('email')} placeholder="contacto@empresa.cl" required />
        <Field label="Teléfono" id="phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+56 2 2345 6789" required />
      </div>
      <Field label="Dirección" id="address" value={form.address} onChange={set('address')} placeholder="Calle y número" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Ciudad" id="city" value={form.city} onChange={set('city')} placeholder="Santiago" />
        <Field label="Comuna" id="commune" value={form.commune} onChange={set('commune')} placeholder="Providencia" />
      </div>
      <RegionSelect value={form.regionId} onChange={set('regionId')} />

      <button
        type="submit"
        className="mt-2 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-sm transition-colors"
      >
        Continuar →
      </button>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepContact({ category, initialData, onSubmit }: StepContactProps) {
  const isNatural = category === 'natural';

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Tus datos de contacto</h1>
        <p className="text-gray-500 mt-2 text-sm">
          {isNatural
            ? 'Los usaremos para enviarte el informe y coordinar la visita técnica.'
            : 'Los usaremos para preparar la propuesta y coordinar el proyecto.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {isNatural ? (
          <NaturalForm
            initial={initialData as PersonContact | null}
            onSubmit={onSubmit}
          />
        ) : (
          <BusinessForm
            initial={initialData as BusinessContact | null}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
}
