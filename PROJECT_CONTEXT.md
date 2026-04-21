# Mercado Energy — Contexto del Proyecto

> Última actualización: 21 de abril 2026
> Repositorio: https://github.com/DaniloCanessa/me
> Producción: https://me-fawn-eight.vercel.app

---

## Objetivo del proyecto

Plataforma web de simulación solar fotovoltaica para Chile. Permite a clientes residenciales y empresas estimar el ahorro, la Planta Fotovoltaica (PFV) recomendada y el retorno de inversión de un sistema solar, en base a sus boletas reales y región geográfica.

El flujo termina con una solicitud de contacto que deriva el lead a un especialista para visita técnica.

---

## Estado actual

**Fase 3 completada. Landing page y contenido público en producción.**

El wizard de 7 pasos está completamente funcional. Incluye: lectura OCR de boletas (múltiples archivos + Excel), captura de leads por email, lógica de 3 escenarios de PFV (residencial) + dimensionamiento continuo (empresa), baterías modulares (dropdowns 1–10 residencial, 1–100 empresa), toggle base/futuro en resultados, gráfico de líneas mensual, exportación de informe PDF (residencial y empresa), interpolación estacional de meses faltantes, aviso de sobredimensionamiento (Regla 2).

La landing page está completamente construida con identidad visual de marca. El simulador usa la paleta de colores de Mercado Energy (azules) en lugar de verdes.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| UI | React 19.2.4 + Tailwind CSS v4 |
| Lenguaje | TypeScript (strict) |
| Hosting | Vercel (deploy automático desde GitHub) |
| Email | Resend (`app/api/leads/route.ts`) |
| OCR | Claude Haiku 4.5 (`app/api/parse-bill/route.ts`) |
| PDF | html2canvas + jsPDF (`PDFDownloadButton.tsx`) |
| BD | Supabase (leads) |

**Nota importante:** Tailwind v4 usa `@import "tailwindcss"` en lugar de directivas `@tailwind`. No mezclar con la sintaxis de v3.

**Nota importante Vercel:** `new Resend(...)` y lectura de `process.env.ANTHROPIC_API_KEY` deben hacerse **dentro del handler** (no a nivel módulo), o el build de Vercel falla porque las variables no están disponibles en tiempo de evaluación del módulo.

---

## Arquitectura

```
mercado-energy/
├── app/
│   ├── layout.tsx                  # Metadata global, font Geist, lang="es"
│   ├── page.tsx                    # Landing page (10 secciones)
│   ├── icon.png                    # Favicon (logotipo-2.png — Next.js lo detecta automáticamente)
│   ├── simulator/
│   │   └── page.tsx                # Contenedor del wizard (WizardState, navegación)
│   ├── net-billing/
│   │   ├── page.tsx                # Página explicativa Net Billing
│   │   └── NetBillingClient.tsx    # Diagrama animado SVG con toggle día/noche
│   ├── terminos/page.tsx           # Términos y condiciones (Ley 19.496, 19.799, 21.719)
│   ├── privacidad/page.tsx         # Política de privacidad (Ley 21.719 completa, 7 derechos)
│   ├── devoluciones/page.tsx       # Política de devoluciones (Ley 19.496, 21.398, SERNAC)
│   ├── admin/
│   │   └── leads/                  # Panel de administración de leads (Supabase)
│   ├── lab/
│   │   └── bill-parser/page.tsx    # Laboratorio experimental de OCR
│   └── api/
│       ├── leads/route.ts          # POST: recibe lead, envía email via Resend
│       ├── contact/route.ts        # POST: formulario de contacto landing (Resend)
│       ├── parse-bill/route.ts     # POST: recibe imagen/PDF/Excel, devuelve JSON via Claude Haiku
│       └── send-report/route.ts    # POST: envía informe PDF por email al lead
│
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx         # Nav + video de fondo (video-poroma.mp4) + stats bar
│   │   ├── HowItWorks.tsx          # Cómo funciona el proceso
│   │   ├── ValueProposition.tsx    # Propuesta de valor
│   │   ├── SimulatorCTA.tsx        # CTA intermedio al simulador
│   │   ├── AboutUs.tsx             # Quiénes somos + equipo
│   │   ├── Solutions.tsx           # Soluciones residencial/empresa
│   │   ├── Brands.tsx              # Marcas de equipos
│   │   ├── Projects.tsx            # Grilla de proyectos ejecutados (9 proyectos)
│   │   ├── FinalCTA.tsx            # CTA final
│   │   ├── ContactSection.tsx      # Formulario de contacto (Persona natural / Empresa)
│   │   ├── Footer.tsx              # Footer con logotipo-2, mapa, pagos, legal
│   │   └── LegalLayout.tsx         # Layout compartido para páginas legales
│   ├── lab/
│   │   └── BillParser.tsx          # UI standalone del lab OCR
│   └── simulator/
│       ├── StepCustomerType.tsx    # Paso 1: Residencial / Empresa y grandes consumidores
│       ├── StepContact.tsx         # Paso 2: datos de contacto (región obligatoria)
│       ├── StepSupply.tsx          # Paso 3: propiedad, empalme (residencial) o potencia/tensión (empresa)
│       ├── StepBills.tsx           # Paso 4: ingreso de boletas + OCR + distribuidora/tarifa manual
│       ├── BillOCRUpload.tsx       # Sub-componente: upload múltiple (JPG/PNG/PDF/Excel)
│       ├── StepBillReview.tsx      # Paso 5: revisión visual (gráfico 12 meses)
│       ├── StepFutureConsumption.tsx # Paso 6: AA, termo, auto eléctrico
│       ├── StepResults.tsx         # Paso 7: escenarios, baterías, CTA, PDF
│       ├── PDFDownloadButton.tsx   # Botón + modal de informe (html2canvas + jsPDF)
│       ├── SimulationReportHtml.tsx # HTML del informe para captura
│       └── SimulatorResults.tsx    # Componente legacy
│   └── ui/
│       └── ProgressBar.tsx         # Barra de progreso de 7 pasos (colores de marca)
│
└── lib/
    ├── types.ts                    # Todas las interfaces TypeScript
    ├── constants.ts                # Parámetros configurables (PFV, tarifas, defaults, baterías, DFL4)
    ├── regions.ts                  # 16 regiones de Chile con producción mensual kWh/kWp
    ├── calculations.ts             # Motor: runSimulation, calcThreeScenarios, selectKits, buildBusinessKit
    ├── consumption.ts              # Cálculos de consumo futuro (AA, termo, EV)
    └── format.ts                   # Formateo de valores (CLP, kWh, %, payback)
```

---

## Wizard — 7 pasos

### Paso 1 — Tipo de cliente (`StepCustomerType`)
- Selección: **Residencial** (casa/departamento) o **Empresa** (oficina/colegio/otro)
- El valor interno sigue siendo `'natural' | 'business'` en `CustomerCategory`
- Avance automático al seleccionar

### Paso 2 — Contacto (`StepContact`)
- **Residencial:** nombre, email, teléfono, dirección, ciudad, comuna, región
- **Empresa:** razón social, contacto, email, teléfono, dirección, ciudad, comuna, región
- Región **obligatoria** — determina la producción solar en la simulación

### Paso 3 — Suministro (`StepSupply`)
- Tipo de propiedad (filtrado por categoría de cliente)
- **Residencial:** amperaje del empalme (obligatorio) — botones 10 / 15 / 20 / 25 / 32 / 40 / 50 / 63 A
  - Limita el tamaño máximo de la PFV (`empalmeMaxKW = amperajeA × 220 / 1000`)
  - SVG ilustrativo de referencia para ubicar el número en el tablero eléctrico
- **Empresa:** dos campos obligatorios:
  1. **Potencia contratada (kW)** — presets 10, 20, 30, 50, 75, 100, 150, 200, 300 kW + campo libre
     - Se usa directamente como `empalmeMaxKW` para limitar el dimensionamiento de la PFV
  2. **Tensión de suministro (BT / AT)** — determina el régimen tarifario aplicable
     - BT: Baja Tensión < 1 kV → tarifas BT1–BT4
     - AT: Alta Tensión ≥ 1 kV → tarifas AT2–AT4, transformador propio
- Toggle: ¿Ya tiene paneles solares? (+ campo kWp si aplica)
- **Distribuidora y tarifa NO se piden aquí** — se extraen de la boleta en el paso 4

### Paso 4 — Boletas (`StepBills`)
- Tabla con los últimos 12 meses generados dinámicamente
- Por mes: consumo en **kWh** (requerido) + monto variable CLP (opcional)
- **OCR integrado:** botón "Subir boleta para autocompletar" usando `BillOCRUpload`
  - Soporta JPG, PNG, PDF
  - **Múltiples archivos a la vez** — procesamiento secuencial, merge por mes-año
  - Claude Haiku extrae datos; el usuario revisa y confirma antes de aplicar
  - Al confirmar, pre-rellena la tabla y propaga distribuidora/tarifa al wizard
  - Para duplicados de mes: se prefiere el registro con `variableAmountCLP` informado
  - Mock mode cuando no hay `ANTHROPIC_API_KEY`
- **Ingreso manual:** campos opcionales de distribuidora y tarifa al ingresar el primer mes
- **Interpolación estacional:** meses sin dato se estiman promediando ±2 vecinos del calendario. Requiere ≥2 meses reales
- Requiere al menos 1 mes para continuar

### Paso 5 — Revisión de boletas (`StepBillReview`)
- Estadísticas: promedio, máximo, mínimo, completitud (X/12)
- **Gráfico de barras CSS con los 12 meses:** meses reales en verde, interpolados en gris
  - kWh mostrado encima de **todas** las barras (máxima en verde bold, resto en gris)
- Tabla detallada: mes, kWh, monto CLP, $/kWh calculado
- Avisos contextuales: precio promedio calculado, meses faltantes

### Paso 6 — Consumos futuros (`StepFutureConsumption`)
- **Aire acondicionado:** steppers por tamaño BTU (9.000 / 12.000 / 18.000)
- **Termo eléctrico:** steppers de ocupantes → calcula capacidad y kWh/mes
- **Auto eléctrico:** cantidad de autos → estima +33% de consumo por auto
- Resumen en vivo: consumo actual vs. proyectado
- **Las baterías ya NO se seleccionan aquí** — se configuran en el paso 7 (Escenario C)

### Paso 7 — Resultados (`StepResults`)
- **Toggle consumo actual / con equipos nuevos** (cuando hay adiciones en paso 6)
  - Recalcula los escenarios con el kWh correspondiente a cada modo
  - Funciona tanto para residencial como empresa
- **3 escenarios de PFV** (solo residencial — ver sección de lógica)
- KPIs, PFV recomendada, desglose financiero (con VAN y payback descontado), tabla de balance mensual
- **Gráfico de líneas SVG** debajo de la tabla: producción, autoconsumo, inyección, red (12 meses)
- **Avisos regulatorios empresa:**
  - Si la PFV óptima supera 300 kW: aviso sobre límite net billing Art. 149 bis DFL 4
  - Siempre: aviso de tratamiento tributario (Art. 149 quinquies DFL 4)
- **Recomendación de tarifa:**
  - `unknown` → pedir que confirme tarifa en boleta
  - `BT4.x` / `AT` → recomendar batería para gestión de horas de punta
- **Análisis EV:** recomendación día/noche/mixto calculada con el balance energético real
- Impacto ambiental: CO₂ evitado y equivalencia en árboles
- **CTA:** "Coordina una reunión con nuestro equipo técnico" → POST `/api/leads` → email via Resend
- **Exportar informe:** disponible para residencial Y empresa. Modal con preview y descarga PDF

---

## Nomenclatura

| Anterior | Actual |
|---|---|
| Persona natural | Residencial |
| Kit solar / Kit X kWp | PFV X kW (Planta Fotovoltaica) |
| kit-Xkwp | pfv-Xkw (IDs en catálogo) |

El tipo interno `CustomerCategory = 'natural' | 'business'` no cambia — solo cambia la etiqueta en la UI.

---

## Lógica de PFV residencial — 3 escenarios

### Principio fundamental
Siempre se recomienda la PFV de **mayor tamaño que cabe dentro del límite del empalme**. Este es el escenario base (A). Nunca se sub-dimensiona por defecto.

### Cálculo del límite de empalme
```
Residencial:  empalmeMaxKW = amperajeA × 220 / 1000
Empresa:      empalmeMaxKW = potenciaContratadaKW  (directo en kW, sin conversión)
```

### Función `selectKits(empalmeMaxKW)` en `lib/calculations.ts`
- **kitA:** PFV más grande cuyo `sizekWp ≤ empalmeMaxKW`. Es siempre la recomendada principal.
- **kitB:** PFV inmediatamente inferior a kitA en el catálogo (opción económica). Es `null` si kitA ya es la más pequeña.

### Escenario A — PFV máxima, sin batería
- Label en UI: "Recomendado"

### Escenario B — PFV menor, sin batería
- Un escalón abajo de kitA
- Label en UI: "Opción económica"
- Solo se muestra si `kitB !== null`

### Escenario C — PFV máxima con baterías
- Misma PFV que escenario A
- Batería: `N × 5 kWh` donde N ∈ {1, 2, 3, 4, 5, 6} — selector en la UI
- Precio: `pfv.priceReferenceCLP + N × 1.500.000 CLP`
- Label en UI: "Con baterías"

---

## Lógica de baterías

### Parámetros clave (en `lib/constants.ts`)
```typescript
SOLAR_DEFAULTS.batteryUsableFraction        = 0.70  // 70% disponible para uso nocturno
SOLAR_DEFAULTS.batteryModuleKWh             = 5     // kWh por módulo de batería
SOLAR_DEFAULTS.batteryModulePriceCLP        = 1_500_000  // CLP por módulo
SOLAR_DEFAULTS.batteryDailyCycleEfficiency  = 0.80  // eficiencia ida+vuelta del ciclo
```

### Modelo de carga y descarga (por mes en `calcMonthlyBalance`)
```
capacidad_usable_diaria  = batteryCapacityKWh × 0.70
reserva_emergencia       = batteryCapacityKWh × 0.30  // nunca se descarga

máx_carga_mensual  = (capacidad_usable_diaria / eficiencia) × días_del_mes
máx_descarga_mensual = capacidad_usable_diaria × eficiencia × días_del_mes

carga_batería   = min(excedente_solar, máx_carga_mensual)
descarga_batería = min(
  carga_batería × eficiencia,
  máx_descarga_mensual,
  consumo_nocturno
)
```

---

## Motor de simulación

### Función principal `runSimulation(input, kit, batteryCapacityKWh, systemCostOverride?)`
Corre la simulación completa para una PFV y capacidad de batería dados. Retorna `SimulatorResult` con balance energético mensual (12 meses), KPIs financieros e impacto ambiental.

### Modelo energético mensual
```
producción_mensual = kit.sizekWp × región.productionKWhPerKWp[mes]

consumo_diurno  = consumoMensual × 0.70   ← FIJO, no cambiar
consumo_nocturno = consumoMensual × 0.30  ← FIJO, no cambiar
```

**IMPORTANTE:** `dayConsumptionRatio = 0.70` es un parámetro fijo de negocio. No debe calcularse dinámicamente desde datos de amanecer/atardecer. Es una simplificación deliberada para tener un modelo predecible y auditable.

### Empresas (`runBusinessSimulation`)
- No usa catálogo — dimensionamiento continuo con `buildBusinessKit()`
- Objetivo: cubrir el 90% del consumo anual (`businessCoverageTarget = 0.90`)
- Capped por `empalmeMaxKW` (potencia contratada) y por 300 kW (Art. 149 bis DFL 4)
- Si la PFV óptima supera 300 kW → `exceedsNetBillingLimit = true` (aviso en UI)
- Precio: `$1.000.000/kWp`
- No tiene escenarios A/B/C ni selector de baterías
- Sí tiene informe PDF (escenario único)

### Cálculo financiero (DFL 4)
```typescript
// Payback simple
paybackYears = systemCostCLP / annualBenefitCLP

// VAN a 25 años con tasa 10% real (Arts. 165d / 182 bis DFL 4)
annuityFactor = (1 - (1 + 0.10)^-25) / 0.10  ≈ 9.077
vanCLP = annualBenefit × annuityFactor - systemCostCLP

// Payback descontado (tasa 10% real)
t = -ln(1 - 0.10 × Cost/AnnualBenefit) / ln(1.10)
// Si arg ≤ 0 → Infinity → "No recupera" en la UI
```

### Precio del kWh
1. Promedio de `variableAmountCLP / consumptionKWh` de las boletas ingresadas
2. Si no hay boletas con monto: precio referencial **220 CLP/kWh**

### Net billing (inyección a la red)
Valor de inyección = **50%** del precio de compra del kWh (norma vigente CNE, Art. 149 bis DFL 4).

---

## Marco regulatorio — DFL 4 (Ley General de Servicios Eléctricos Chile)

Leída completa (3.666 líneas). Artículos relevantes implementados:

| Artículo | Descripción | Implementación |
|---|---|---|
| Art. 149 bis | Net billing: derecho a inyectar; máx 300 kW por inmueble | `DFL4.netBillingMaxKWp = 300` — caps `buildBusinessKit()` |
| Art. 149 ter | Excedentes transferibles a otras propiedades del mismo dueño | Nota informativa (no afecta cálculo) |
| Art. 149 quinquies | Exención tributaria: ahorro y pagos NO son renta para personas naturales y empresas en régimen simplificado. Empresas Primera Categoría SÍ tributan sobre pagos por excedentes | Banner informativo en resultados empresa |
| Arts. 165d / 182 bis | Tasa de descuento 10% real anual para proyectos eléctricos | `DFL4.discountRateReal = 0.10` — usado en VAN y payback descontado |
| Art. 225 l) | "Potencia conectada": potencia máxima dada la capacidad del empalme | Campo `potenciaContratadaKW` en `SupplyData` para empresas |

### Constante `DFL4` en `lib/constants.ts`
```typescript
export const DFL4 = {
  netBillingMaxKWp: 300,     // Art. 149 bis
  discountRateReal: 0.10,    // Arts. 165d / 182 bis
};
```

### Tratamiento tributario empresas (Art. 149 quinquies)
- **Personas naturales:** ahorro y pagos de excedentes = libre de impuesto
- **Empresas régimen simplificado (14 ter):** igual que personas naturales
- **Empresas Primera Categoría con contabilidad completa:** pagos por excedentes SÍ son renta gravable. El ahorro por autoconsumo no (reduce costos operacionales).
- Nota: se muestra siempre en resultados empresa como aviso

---

## Catálogo PFV Residencial

### Sin batería
| ID | kWp | Paneles | Área | Precio ref. |
|---|---|---|---|---|
| pfv-1.1kw  | 1.1  | 2  | 5 m²  | $1.320.000 |
| pfv-2.2kw  | 2.2  | 4  | 10 m² | $2.640.000 |
| pfv-3.3kw  | 3.3  | 6  | 15 m² | $3.960.000 |
| pfv-5.5kw  | 5.5  | 10 | 25 m² | $6.600.000 |
| pfv-6.6kw  | 6.6  | 12 | 30 m² | $7.920.000 |
| pfv-8.8kw  | 8.8  | 16 | 40 m² | $10.560.000 |
| pfv-10kw   | 10   | 18 | 45 m² | $12.000.000 |
| pfv-11kw   | 11   | 20 | 50 m² | $13.200.000 |
| pfv-13.9kw | 13.9 | 26 | 65 m² | $16.680.000 |

### Con batería
| ID | kWp | Batería | Precio ref. |
|---|---|---|---|
| pfv-2.2kw-battery  | 2.2 | 5 kWh  | $4.140.000 |
| pfv-3.3kw-battery  | 3.3 | 5 kWh  | $5.460.000 |
| pfv-5.5kw-battery  | 5.5 | 10 kWh | $9.600.000 |
| pfv-8.8kw-battery  | 8.8 | 10 kWh | $13.560.000 |
| pfv-11kw-battery   | 11  | 15 kWh | $17.700.000 |

**Panel estándar:** 550 Wp, 2,5 m² · **Precio base:** ~$1.200.000/kWp
**Módulo de batería (escenario C):** 5 kWh, $1.500.000 CLP (hasta 6 módulos = 30 kWh)

### Empresas — Dimensionamiento continuo
- Rango: desde ~1 kWp hasta 300 kWp (límite net billing DFL 4)
- Precio: $1.000.000/kWp
- Para sistemas > 300 kW: se requiere otro marco regulatorio (PMGD/PMG)

---

## Regiones de Chile

16 regiones con producción solar mensual (kWh/kWp) calibrada con eficiencia del sistema:

| Zona | Regiones | Producción anual (kWh/kWp) |
|---|---|---|
| Norte | Arica, Tarapacá, Antofagasta, Atacama, Coquimbo | 1.750 – 2.090 |
| Central | Valparaíso, RM, O'Higgins, Maule, Ñuble, Biobío | 1.343 – 1.576 |
| Sur | Araucanía, Los Ríos, Los Lagos | 1.050 – 1.210 |
| Austral | Aysén, Magallanes | 745 – 890 |

---

## Parámetros clave (todos en `lib/constants.ts`)

```typescript
CHILE_BT1.referenceKWhPriceCLP          = 220         // CLP/kWh referencial
CHILE_BT1.fixedChargeCLP                = 1_200       // cargo fijo mensual

DFL4.netBillingMaxKWp                   = 300         // Art. 149 bis DFL 4
DFL4.discountRateReal                   = 0.10        // Arts. 165d / 182 bis DFL 4

SOLAR_DEFAULTS.injectionValueFactor     = 0.50        // net billing 50%
SOLAR_DEFAULTS.dayConsumptionRatio      = 0.70        // 70% consumo diurno — NO CAMBIAR
SOLAR_DEFAULTS.nightConsumptionRatio    = 0.30        // 30% consumo nocturno — NO CAMBIAR
SOLAR_DEFAULTS.systemLifeYears          = 25          // vida útil sistema
SOLAR_DEFAULTS.panelWattage             = 550         // W por panel residencial
SOLAR_DEFAULTS.panelAreaM2              = 2.5         // m² por panel

SOLAR_DEFAULTS.batteryUsableFraction    = 0.70        // 70% usable para descarga nocturna
SOLAR_DEFAULTS.batteryModuleKWh         = 5           // kWh por módulo de batería
SOLAR_DEFAULTS.batteryModulePriceCLP    = 1_500_000   // precio por módulo
SOLAR_DEFAULTS.batteryDailyCycleEfficiency = 0.80     // eficiencia ida+vuelta

SOLAR_DEFAULTS.evConsumptionIncreasePerCar  = 0.33    // +33% por auto eléctrico
SOLAR_DEFAULTS.businessCoverageTarget       = 0.90    // cobertura objetivo empresas

BUSINESS_DEFAULTS.costPerKWpCLP         = 1_000_000  // precio empresa por kWp
```

---

## Exportación de PDF

Implementado con **html2canvas + jsPDF** (compatible con React 19).

- Componente: `SimulationReportHtml.tsx` — HTML puro con estilos inline para captura
- Botón: `PDFDownloadButton.tsx` — captura con html2canvas, genera PDF con jsPDF, con caché
- Modal con preview del informe antes de descargar
- Al abrir el modal: envía el informe por email al lead automáticamente (una sola vez)
- Disponible para **residencial y empresa**

### Contenido del informe residencial
- Header verde: nombre, región, tarifa, fecha
- Datos del cliente (identificación + ubicación + datos eléctricos)
- Gráfico de consumo mensual (barras SVG)
- PFV recomendada: tamaño, paneles, área, precio, batería si aplica
- 4 KPIs: cobertura, ahorro mensual, ahorro anual, período de retorno
- Texto explicativo generado
- Gráfico de generación mensual proyectada (línea SVG)
- Desglose financiero: autoconsumo, inyección, total anual, ROI
- **Sección de comparación A/B/C** con los 3 escenarios
- Impacto ambiental y nota metodológica

### Contenido del informe empresa
- Igual que residencial, pero **sin sección de comparación A/B/C**
- Header dice "Sistema dimensionado · PFV X kW" en lugar de escenario recomendado
- Tipo de cliente: "Empresa"

### Props de `PDFDownloadButton`
```typescript
interface Props {
  state: WizardState;
  scenarios?: KitScenarios;       // residencial
  recommendedScenario?: 'A'|'B'|'C'; // residencial
  businessResult?: SimulatorResult;  // empresa
  clientName: string;
  clientEmail: string;
}
```

---

## Captura de leads

**Funcionando.** Al hacer clic en el CTA:
- `StepResults` hace POST a `/api/leads` con todos los datos del lead y simulación activa
- El payload incluye `supply_details` con `amperajeA` (residencial) o `potenciaContratadaKW` + `tensionSuministro` (empresa)
- Resend envía email HTML al operador con `replyTo` del lead
- `from: 'Mercado Energy <onboarding@resend.dev>'`
- Variables de entorno necesarias: `RESEND_API_KEY`, `LEAD_RECIPIENT_EMAIL`

---

## OCR de boletas

**Funcionando end-to-end en producción.**

```
Usuario sube 1 o más archivos (JPG/PNG/PDF)
  → BillOCRUpload procesa secuencialmente
  → POST /api/parse-bill por cada archivo
    → Claude Haiku (claude-haiku-4-5-20251001) lee la boleta
    → Retorna JSON: distribuidora, tarifa, períodos con kWh y montos
  → Se mergean períodos de todos los archivos (prioridad: el que tiene variableAmountCLP)
  → Usuario revisa tabla editable y confirma
    → Se rellenan los meses en la tabla del paso 4
    → distribuidora y tarifa se propagan al WizardState
```

**Reglas del prompt OCR:**
- Períodos que cruzan meses (ej: 17 jul → 18 ago) → mes de **término** (agosto)
- Montos en CLP como enteros (sin puntos de miles)
- Incluye historial completo visible en la boleta
- Header `anthropic-beta: pdfs-2024-09-25` solo se envía para archivos PDF (no para imágenes)

**Mock mode:** cuando no hay `ANTHROPIC_API_KEY`, retorna datos simulados con patrón estacional realista.

---

## Decisiones de diseño clave

### PFV siempre al máximo del empalme
Se recomienda la PFV más grande posible dentro del límite físico del empalme. Nunca se sub-dimensiona por defecto.

### Empresas usan potencia contratada, no amperaje
Para empresas, el límite del empalme es la **potencia contratada en kW** (campo `potenciaContratadaKW`), capturada directamente sin conversión. El amperaje se muestra solo para residencial (monofásico 220 V).

### `dayConsumptionRatio` fijo en 0.70
Parámetro de negocio fijo y deliberado — **no debe calcularse dinámicamente** desde datos de amanecer/atardecer. Simplificación que hace el modelo predecible y auditable.

### Baterías: 70% uso / 30% reserva
El 30% se reserva para cortes de luz. Controlado con `batteryUsableFraction = 0.70`.

### Tarifa `'unknown'`
Se guarda sin resolver en `SupplyData.tarifa`. Solo se resuelve a `'BT1'` dentro del motor de cálculo en `buildBaseInput`. Permite mostrar avisos diferenciados en resultados.

### Distribuidora y tarifa — captura diferida al paso 4
Se capturan automáticamente si el usuario sube una boleta (OCR), o manualmente en el paso 4. Se propagan al `WizardState` mediante `onUpdateSupply`.

### VAN usa tasa 10% real (DFL 4)
La tasa del 10% real anual es la tasa de actualización referencial del sector eléctrico chileno (Arts. 165d y 182 bis DFL 4). Se usa para calcular el VAN a 25 años y el payback descontado. Un VAN positivo significa que el proyecto crea valor por encima de esta tasa de referencia.

### Protección de entregables
`select-none` + `onCopy preventDefault` en `StepBillReview` y `StepResults`.

---

## Landing page

### Estructura (10 secciones en `app/page.tsx`)
1. `HeroSection` — nav, video de fondo (`/videos/video-poroma.mp4`), headline, CTA, stats bar
2. `HowItWorks` — proceso en 3 pasos
3. `ValueProposition` — beneficios clave
4. `SimulatorCTA` — CTA intermedio
5. `AboutUs` — equipo e historia
6. `Solutions` — residencial vs empresa
7. `Brands` — marcas de equipos
8. `Projects` — 9 proyectos ejecutados con imagen y tags
9. `FinalCTA` — CTA final
10. `ContactSection` — formulario (Persona natural / Empresa + nombre de contacto)
11. `Footer` — logotipo-2, mapa Google, pagos, navegación, legal

### Proyectos en la grilla
| Proyecto | Imagen |
|---|---|
| Poroma, Tarapacá | `/images/poroma-img.jpg` |
| Panadería San Bernardo | `/images/panaderia-san-bernardo.jpg` |
| Casa Carlos Alvarado, Las Condes | `/images/casa-carlos-alvarado.jpg` |
| Coscaya, Huara | `/images/proyecto-coscaya.jpg` |
| Caleta Los Bronces, Atacama | `/images/proyecto-caleta-los-bronces.jpg` |
| Universidad de Talca | `/images/proyecto-talca.jpg` |
| Río Ibáñez, Aysén | `/images/proyecto-rio-ibanez.jpg` |
| Lonquimay, Araucanía | `/images/proyecto-lonquimay.jpg` |
| Puerto Carmen, Quellón | `/images/proyecto-quellon.jpg` |

### Formulario de contacto (`/api/contact`)
- Campos Persona natural: nombre, email, teléfono, mensaje
- Campos Empresa: empresa/razón social, nombre de contacto, teléfono, email, mensaje
- Envío via Resend al operador

### Paleta de colores de marca
```
#389fe0  — azul primario (CTAs, acentos, barras de progreso)
#1d65c5  — azul oscuro (hover, fondos de sección)
#ade1ed  — azul claro (badges, textos secundarios en oscuro)
#70caca  — teal (decorativo)
#b0cedd  — gris azulado (bordes, fondos suaves)
#dde3e9  — gris claro (fondos, backgrounds)
#010101  — casi negro (nav, footer, textos principales)
#ffffff  — blanco
```

### Identidad visual del simulador
- Nav con fondo `#b0cedd` y logo `logotipo.png`
- Fondo general `#f4f8fb`
- Todos los colores verdes reemplazados por azules de marca
- ProgressBar en `#389fe0` / `#1d65c5`
- Favicon: `app/icon.png` (logotipo-2.png)

---

## Páginas públicas adicionales

| Ruta | Descripción |
|---|---|
| `/net-billing` | Explicación del Net Billing con diagrama SVG animado (toggle día/noche) y marco regulatorio |
| `/terminos` | Términos y condiciones (Ley 19.496, 19.799, 21.719, 17.336) — incluye sección de condiciones del simulador |
| `/privacidad` | Política de privacidad (Ley 21.719 completa: 7 derechos, bases legales, Agencia de Datos) |
| `/devoluciones` | Política de devoluciones (Ley 19.496, 21.398, 21.521, SERNAC, plazos legales) |

---

## Advertencias conocidas

- **Middleware deprecado:** `middleware.ts` usa la convención antigua. Next.js 16 lo llama "proxy". No afecta funcionalidad pero genera warning en build. Pendiente renombrar a `proxy.ts`.

---

## Pendientes y próximos pasos

### Alta prioridad

- [ ] **Regla 1: escenario óptimo automático**
  - Si el payback de A es > 12 años Y el de B es < 10 años → recomendar B como default

- [ ] **PDF empresa completo**
  - Agregar datos de potencia contratada y tensión al informe empresa

### Media prioridad

- [ ] **Precio de kWh dinámico por distribuidora/tarifa**
  - Hoy usa $220 fijo cuando no hay monto en la boleta
  - Tabla de precios referenciales por distribuidora y tarifa

- [ ] **Corregir advertencia de middleware**
  - Renombrar `middleware.ts` → `proxy.ts` (convención Next.js 16)

### Baja prioridad / futuro

- [ ] **Múltiples tarifas en resultados** — comparar qué tarifa conviene según perfil de demanda
- [ ] **Modelo horario para BT4.x/AT** — integrar precios por bloque horario con batería
- [ ] **Actualización de precios de PFV** — panel para actualizar sin tocar código
- [ ] **Ajuste de consumo AA por zona climática** — norte vs. sur tienen perfiles distintos
- [ ] **PMGD/PMG para empresas > 300 kW** — marco regulatorio diferente al net billing

---

## Flujo de datos resumido

```
StepCustomerType      → customerCategory ('natural' | 'business')
StepContact           → contact { regionId, email, ... }
StepSupply            → supply {
                          amperajeA,             ← solo residencial
                          potenciaContratadaKW,  ← solo empresa
                          tensionSuministro,     ← solo empresa
                          propertyType,
                          hasExistingSolar
                        }
StepBills             → consumptionProfile { bills[], averageMonthlyKWh, ... }
                      → supply.distribuidora + supply.tarifa (vía onUpdateSupply)
StepBillReview        → (solo visualización — confirma y avanza)
StepFutureConsumption → futureConsumption { airConditioners, waterHeater, evCharger,
                         totalAdditionalMonthlyKWh }
StepResults           → buildBaseInput() → empalmeMaxKW según tipo de cliente
                      → calcThreeScenarios(baseInput, batteryCount)   ← residencial
                      → calcThreeScenarios(futureInput, batteryCount)  ← si hay adiciones
                      → runBusinessSimulation(input)                   ← empresa
                      → calcEVCharger() con balance energético real
                      → POST /api/leads si el usuario hace clic en CTA
                      → PDFDownloadButton genera informe (residencial o empresa)
```

---

## Comandos útiles

```bash
# Desarrollo local
npm run dev          # http://localhost:3000

# Verificar tipos
npx tsc --noEmit

# Deploy
git push origin main  # Vercel despliega automáticamente

# Variables de entorno necesarias (.env.local y en Vercel)
RESEND_API_KEY=...
LEAD_RECIPIENT_EMAIL=danilo.canessa@gmail.com
ANTHROPIC_API_KEY=...   # Si no está, OCR funciona en mock mode
```
