'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { WizardState, WizardStep, CustomerCategory, SupplyData } from '@/lib/types';
import ProgressBar from '@/components/ui/ProgressBar';
import StepCustomerType from '@/components/simulator/StepCustomerType';
import StepContact from '@/components/simulator/StepContact';
import StepSupply from '@/components/simulator/StepSupply';
import StepBills from '@/components/simulator/StepBills';
import StepBillReview from '@/components/simulator/StepBillReview';
import StepFutureConsumption from '@/components/simulator/StepFutureConsumption';
import StepResults from '@/components/simulator/StepResults';

// ─── Orden y estado inicial del wizard ───────────────────────────────────────

export const STEP_ORDER: WizardStep[] = [
  'customer-type',
  'contact',
  'supply',
  'bills',
  'bill-review',
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

// ─── Página principal del wizard ──────────────────────────────────────────────

export default function SimulatorPage() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

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
    <main className="min-h-screen bg-slate-50">
      {/* Barra de navegación */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-green-600 hover:text-green-700 text-sm font-medium">
            ← Inicio
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Simulador Solar</span>
        </div>
      </nav>

      {/* Barra de progreso */}
      <ProgressBar currentStep={state.step} />

      {/* Contenido del paso activo */}
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Botón volver — visible en todos los pasos excepto el primero */}
        {!isFirstStep && (
          <button
            type="button"
            onClick={goBack}
            className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
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
            category={state.customerCategory!}
            initialData={state.contact}
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
            onSubmit={(consumptionProfile) => {
              update({ consumptionProfile });
              goNext();
            }}
            onUpdateSupply={(partial) =>
              update({ supply: { ...state.supply!, ...partial } })
            }
          />
        )}

        {state.step === 'bill-review' && (
          <StepBillReview
            profile={state.consumptionProfile!}
            onConfirm={goNext}
          />
        )}

        {state.step === 'future-consumption' && (
          <StepFutureConsumption
            initialData={state.futureConsumption}
            averageMonthlyKWh={state.consumptionProfile!.averageMonthlyKWh}
            onSubmit={(futureConsumption) => {
              update({ futureConsumption });
              goNext();
            }}
          />
        )}

        {state.step === 'results' && (
          <StepResults state={state} />
        )}

      </div>
    </main>
  );
}
