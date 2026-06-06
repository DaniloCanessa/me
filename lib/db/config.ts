import { getSupabaseAdmin } from '@/lib/supabase';
import { CHILE_BT1, DFL4, SOLAR_DEFAULTS, BUSINESS_DEFAULTS } from '@/lib/constants';
import type { SimulatorConfig } from '@/lib/types';

const DEFAULTS: SimulatorConfig = {
  kwhPriceCLP:            CHILE_BT1.referenceKWhPriceCLP,
  injectionFactor:        SOLAR_DEFAULTS.injectionValueFactor,
  dayConsumptionRatio:    SOLAR_DEFAULTS.dayConsumptionRatio,
  systemLifeYears:        SOLAR_DEFAULTS.systemLifeYears,
  panelWattageWp:         SOLAR_DEFAULTS.panelWattage,
  panelAreaM2:            SOLAR_DEFAULTS.panelAreaM2,
  co2FactorKgPerKWh:      SOLAR_DEFAULTS.co2FactorKgPerKWh,
  batteryModuleKWh:       SOLAR_DEFAULTS.batteryModuleKWh,
  batteryModulePriceCLP:  SOLAR_DEFAULTS.batteryModulePriceCLP,
  batteryCycleEfficiency: SOLAR_DEFAULTS.batteryDailyCycleEfficiency,
  batteryUsableFraction:  SOLAR_DEFAULTS.batteryUsableFraction,
  costPerKWpBusinessCLP:  BUSINESS_DEFAULTS.costPerKWpCLP,
  businessCoverageTarget: SOLAR_DEFAULTS.businessCoverageTarget,
  netBillingMaxKWp:       DFL4.netBillingMaxKWp,
  discountRateReal:       DFL4.discountRateReal,
};

export async function getSimConfig(): Promise<SimulatorConfig> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('config_parameters')
      .select('key, value');

    if (error || !data?.length) return DEFAULTS;

    const map: Record<string, number> = {};
    for (const row of data) {
      const n = Number(row.value);
      if (!isNaN(n)) map[row.key] = n;
    }

    return {
      kwhPriceCLP:            map['simulator.kwh_price_clp']        ?? DEFAULTS.kwhPriceCLP,
      injectionFactor:        map['simulator.injection_factor']      ?? DEFAULTS.injectionFactor,
      dayConsumptionRatio:    map['simulator.day_consumption_ratio'] ?? DEFAULTS.dayConsumptionRatio,
      systemLifeYears:        map['simulator.system_life_years']     ?? DEFAULTS.systemLifeYears,
      panelWattageWp:         map['simulator.panel_wattage_wp']      ?? DEFAULTS.panelWattageWp,
      panelAreaM2:            map['simulator.panel_area_m2']         ?? DEFAULTS.panelAreaM2,
      co2FactorKgPerKWh:      map['simulator.co2_factor_kg_per_kwh'] ?? DEFAULTS.co2FactorKgPerKWh,
      batteryModuleKWh:       map['battery.module_kwh']              ?? DEFAULTS.batteryModuleKWh,
      batteryModulePriceCLP:  map['battery.module_price_clp']        ?? DEFAULTS.batteryModulePriceCLP,
      batteryCycleEfficiency: map['battery.cycle_efficiency']        ?? DEFAULTS.batteryCycleEfficiency,
      batteryUsableFraction:  map['battery.usable_fraction']         ?? DEFAULTS.batteryUsableFraction,
      costPerKWpBusinessCLP:  map['business.cost_per_kwp_clp']       ?? DEFAULTS.costPerKWpBusinessCLP,
      businessCoverageTarget: map['business.coverage_target']        ?? DEFAULTS.businessCoverageTarget,
      netBillingMaxKWp:       map['regulatory.net_billing_max_kwp']  ?? DEFAULTS.netBillingMaxKWp,
      discountRateReal:       map['regulatory.discount_rate_real']   ?? DEFAULTS.discountRateReal,
    };
  } catch {
    return DEFAULTS;
  }
}

export interface WhatsAppConfig {
  number: string;   // código país + número, sin "+"
  message: string;  // mensaje pre-escrito del click-to-chat
}

const WHATSAPP_DEFAULTS: WhatsAppConfig = {
  number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '56912345678',
  message: 'Hola, me gustaría cotizar un proyecto de energía solar.',
};

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('config_parameters')
      .select('key, value')
      .in('key', ['whatsapp.number', 'whatsapp.default_message']);

    if (error || !data?.length) return WHATSAPP_DEFAULTS;

    const map: Record<string, string> = {};
    for (const row of data) map[row.key] = String(row.value);

    return {
      number:  map['whatsapp.number']          || WHATSAPP_DEFAULTS.number,
      message: map['whatsapp.default_message'] || WHATSAPP_DEFAULTS.message,
    };
  } catch {
    return WHATSAPP_DEFAULTS;
  }
}

// URLs de redes sociales del footer. Cadena vacía = red oculta.
export interface SocialConfig {
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
}

const SOCIAL_KEYS: Record<keyof SocialConfig, string> = {
  instagram: 'social.instagram',
  facebook:  'social.facebook',
  youtube:   'social.youtube',
  tiktok:    'social.tiktok',
};

const SOCIAL_DEFAULTS: SocialConfig = { instagram: '', facebook: '', youtube: '', tiktok: '' };

export async function getSocialConfig(): Promise<SocialConfig> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('config_parameters')
      .select('key, value')
      .in('key', Object.values(SOCIAL_KEYS));

    if (error || !data?.length) return SOCIAL_DEFAULTS;

    const map: Record<string, string> = {};
    for (const row of data) map[row.key] = String(row.value ?? '');

    return {
      instagram: map[SOCIAL_KEYS.instagram] ?? '',
      facebook:  map[SOCIAL_KEYS.facebook]  ?? '',
      youtube:   map[SOCIAL_KEYS.youtube]   ?? '',
      tiktok:    map[SOCIAL_KEYS.tiktok]    ?? '',
    };
  } catch {
    return SOCIAL_DEFAULTS;
  }
}

export type { SimulatorConfig };
