'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { WizardState, WizardStep, CustomerCategory, SupplyData, SimulatorConfig, SolarKit } from '@/lib/types';
import ProgressBar from '@/components/ui/ProgressBar';
import StepCustomerType from '@/components/simulator/StepCustomerType';
import StepContact from '@/components/simulator/StepContact';
import StepSupply from '@/components/simulator/StepSupply';
import StepBills from '@/components/simulator/StepBills';
import StepFutureConsumption from '@/components/simulator/StepFutureConsumption';
import StepResults from '@/components/simulator/StepResults';
import type { SimulatorClientOption } from '@/lib/db/clients';
import { buildPrefill, type Prefill } from '@/lib/simulator-prefill';
import type { BoletaArchivadaLocal } from '@/components/simulator/BillOCRUpload';

type Installation = SimulatorClientOption['installations'][number];

const STEP_ORDER: WizardStep[] = [
  'customer-type',
  'contact',
  'supply',
  'bills',
  'future-consumption',
  'results',
];

const INITIAL_STATE: WizardState = {
  step: 'customer-type',
  customerCategory: null,
  contact: null,
  supply: null,
  consumptionProfile: null,
  futureConsumption: null,
  simulationResult: null,
};

interface Props {
  config: SimulatorConfig;
  catalog: SolarKit[];
  /** true solo con sesión de admin: habilita el OCR de boletas (Opus 4.8). */
  ocrEnabled?: boolean;
  /** true cuando se renderiza dentro del backoffice (junto al sidebar): oculta el navbar público. */
  embedded?: boolean;
  /** Clientes del CRM para arrancar la simulación con sus datos. Solo back-office. */
  clients?: SimulatorClientOption[];
}

export default function SimulatorClient({ config, catalog, ocrEnabled = false, embedded = false, clients }: Props) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  // Cliente del CRM para el que se está simulando (habilita crear la cotización
  // al final sin volver a pedir los datos).
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  // El formulario de contacto guarda su propio estado interno, así que al
  // cargar un cliente hay que remontarlo para que muestre los datos nuevos.
  const [contactKey, setContactKey] = useState(0);
  // Boletas archivadas al procesarlas con OCR + identificación del documento.
  // Se retienen para poder guardarlas junto a la simulación en la ficha.
  const [billInfo, setBillInfo] = useState<{
    archivadas: BoletaArchivadaLocal[];
    fechaBoleta: string | null;
    numeroBoleta: string | null;
    distribuidora: string | null;
  } | null>(null);

  // Al elegir un cliente en el campo de nombre se cargan sus datos y los de su
  // instalación, SIN reiniciar el wizard ni cambiar de paso.
  function pickClient(client: SimulatorClientOption, installation: Installation | null) {
    const p = buildPrefill(client, installation, state.customerCategory ?? undefined);
    setPrefill(p);
    setState((prev) => ({ ...prev, contact: p.contact, supply: p.supply }));
    setContactKey((k) => k + 1);
  }

  // Desvincular deja los datos ya cargados en el formulario: solo corta la
  // relación con el CRM, para que la cotización no se le atribuya a ese cliente.
  function clearPrefill() {
    setPrefill(null);
  }

  function goTo(step: WizardStep) {
    setState((prev) => ({ ...prev, step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    const idx = STEP_ORDER.indexOf(state.step);
    if (idx < STEP_ORDER.length - 1) goTo(STEP_ORDER[idx + 1]);
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(state.step);
    if (idx > 0) goTo(STEP_ORDER[idx - 1]);
  }

  function update(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  const isFirstStep = state.step === STEP_ORDER[0];

  return (
    <main className={`${embedded ? 'min-h-full' : 'min-h-screen'} bg-[#f4f8fb]`}>
      {/* Barra de navegación (solo versión pública — en el backoffice el sidebar hace de chrome) */}
      {!embedded && (
        <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#b0cedd]/40 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Link href="/">
              <Image src="/images/logotipo.png" alt="Mercado Energy" width={160} height={48} className="h-16 md:h-20 w-auto" />
            </Link>
            <span className="text-sm font-semibold bg-gradient-to-r from-[#389fe0] to-[#1d65c5] bg-clip-text text-transparent">
              Simulador solar
            </span>
          </div>
        </nav>
      )}

      {/* Barra de progreso */}
      <ProgressBar currentStep={state.step} />

      {/* Contenido del paso activo */}
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Botón volver */}
        {!isFirstStep && (
          <button
            type="button"
            onClick={goBack}
            className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#389fe0] transition-colors"
          >
            <span className="text-base leading-none">←</span> Volver
          </button>
        )}

        {state.step === 'customer-type' && (
          <StepCustomerType
            selected={state.customerCategory}
            onSelect={(category: CustomerCategory) => {
              update({ customerCategory: category });
              goNext();
            }}
          />
        )}

        {state.step === 'contact' && (
          <StepContact
            key={contactKey}
            category={state.customerCategory!}
            initialData={state.contact}
            clients={clients}
            selectedClient={prefill ? { nombre: prefill.clientLabel, instalacion: null } : null}
            onPickClient={pickClient}
            onClearClient={clearPrefill}
            onSubmit={(contact) => {
              update({ contact });
              goNext();
            }}
          />
        )}

        {state.step === 'supply' && (
          <StepSupply
            category={state.customerCategory!}
            initialData={state.supply}
            contact={state.contact}
            onSubmit={(supply: SupplyData) => {
              update({ supply });
              goNext();
            }}
          />
        )}

        {state.step === 'bills' && (
          <StepBills
            initialData={state.consumptionProfile}
            supply={state.supply!}
            ocrEnabled={ocrEnabled}
            isBusinessCustomer={state.customerCategory === 'business'}
            onSubmit={(consumptionProfile) => {
              update({ consumptionProfile });
              goNext();
            }}
            onBillsArchived={setBillInfo}
            onUpdateSupply={(partial) =>
              update({ supply: { ...state.supply!, ...partial } })
            }
          />
        )}

        {state.step === 'future-consumption' && (
          <StepFutureConsumption
            initialData={state.futureConsumption}
            averageMonthlyKWh={state.consumptionProfile!.averageMonthlyKWh}
            isBusinessCustomer={state.customerCategory === 'business'}
            onSubmit={(futureConsumption) => {
              update({ futureConsumption });
              goNext();
            }}
          />
        )}

        {state.step === 'results' && (
          <StepResults state={state} config={config} catalog={catalog} adminMode={ocrEnabled}
            clientId={prefill?.clientId} installationId={prefill?.installationId ?? undefined}
            billInfo={billInfo} />
        )}

      </div>
    </main>
  );
}
