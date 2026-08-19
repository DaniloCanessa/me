import type {
  CustomerCategory, PersonContact, BusinessContact, SupplyData, TarifaType, PropertyType,
} from '@/lib/types';
import type { SimulatorClientOption } from '@/lib/db/clients';

// ─── Prellenado del simulador desde un cliente del CRM ───────────────────────
//
// Traduce lo que el CRM ya sabe (cliente + instalación) al estado del wizard,
// para no retipear los mismos datos en cada cotización.
//
// NO se prellena el consumo: la simulación se alimenta de las boletas reales
// que se cargan en el paso correspondiente, y de ahí sale la estacionalidad.
// El `consumo_promedio_mensual_kwh` de la instalación es un dato de referencia
// del CRM, no necesariamente el promedio de 12 boletas.

export type Installation = SimulatorClientOption['installations'][number];

export type Prefill = {
  customerCategory: CustomerCategory;
  contact: PersonContact | BusinessContact;
  supply: SupplyData;
  clientId: string;
  installationId: string | null;
  clientLabel: string;
  /** Campos que la ficha no tenía y hay que completar a mano. */
  faltantes: string[];
};

const TARIFAS_VALIDAS: TarifaType[] = [
  'BT1', 'BT2', 'BT3', 'BT4.1', 'BT4.2', 'BT4.3', 'AT2', 'AT3', 'AT4.1', 'AT4.2', 'AT4.3',
];

const esTarifa = (s: string | null): s is TarifaType =>
  !!s && (TARIFAS_VALIDAS as string[]).includes(s);

// El tipo de propiedad no vive en la ficha: se asume el más habitual según el
// tipo de cliente y el usuario lo corrige en el paso de suministro si aplica.
const propertyTypePorDefecto = (cat: CustomerCategory): PropertyType =>
  cat === 'business' ? 'oficina' : 'casa';

export function buildPrefill(
  client: SimulatorClientOption,
  installation: Installation | null,
  /** Tipo ya elegido en el paso 1: manda por sobre el de la ficha, porque es
   *  una decisión explícita del usuario para ESTA simulación. */
  categoryOverride?: CustomerCategory,
): Prefill {
  // El tipo lo manda la instalación; si no lo tiene, se infiere de si el
  // cliente está registrado como empresa.
  const customerCategory: CustomerCategory =
    categoryOverride ?? installation?.customer_type ?? (client.empresa ? 'business' : 'natural');

  const email = client.email ?? '';
  const phone = client.telefono ?? '';
  const address = installation?.direccion ?? '';
  const city = installation?.ciudad ?? client.ciudad ?? '';
  const commune = installation?.comuna ?? '';
  const regionId = installation?.region_id ?? '';

  const contact: PersonContact | BusinessContact = customerCategory === 'business'
    ? {
        companyName: client.empresa || client.nombre,
        contactName: client.atencion_a || client.nombre,
        email, phone, address, city, commune, regionId,
      }
    : { name: client.nombre, email, phone, address, city, commune, regionId };

  const tarifaGuardada = esTarifa(installation?.tarifa ?? null) ? (installation!.tarifa as TarifaType) : null;

  const supply: SupplyData = {
    propertyType: propertyTypePorDefecto(customerCategory),
    distribuidora: installation?.distribuidora ?? undefined,
    // Residencial es BT1 por definición (se dejó de preguntar en la sesión 31).
    tarifa: customerCategory === 'natural' ? 'BT1' : (tarifaGuardada ?? 'BT2'),
    amperajeA: installation?.amperaje_a ?? undefined,
    potenciaContratadaKW: installation?.potencia_contratada_kw ?? undefined,
    tensionSuministro: installation?.tension_suministro ?? undefined,
    hasExistingSolar: false,
  };

  // Lo que la ficha no tenía: se le avisa al usuario para que sepa qué revisar.
  const faltantes: string[] = [];
  if (!regionId) faltantes.push('región');
  if (!commune) faltantes.push('comuna');
  if (!email) faltantes.push('email');
  if (customerCategory === 'natural' && !supply.amperajeA) faltantes.push('amperaje del empalme');
  if (customerCategory === 'business' && !supply.potenciaContratadaKW) faltantes.push('potencia contratada');

  return {
    customerCategory,
    contact,
    supply,
    clientId: client.id,
    installationId: installation?.id ?? null,
    clientLabel: installation
      ? `${client.nombre} · ${installation.nombre_instalacion}`
      : client.nombre,
    faltantes,
  };
}
