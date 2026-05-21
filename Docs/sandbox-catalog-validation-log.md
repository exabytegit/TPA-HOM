# Sandbox Catalog Validation Log

## Last Run

- executed_at: 2026-05-21T12:44:16.372Z
- environment: sandbox
- total_items: 9
- success_count: 6
- failed_count: 3

## Results

| slug | modelId | planId | seller | amount | status | link_host | error |
|---|---:|---:|---|---:|---|---|---|
| hilux-4x4-dc-dx-24-tdi-at-plan-100 | 114 | 113 | HOM | 558824.14 | ok | sdx.suscripcion.toyotaplan.com.ar | - |
| yaris-cross-xli-15-cvt-flex-70-30 | 115 | 115 | HOM | 465393.18 | ok | sdx.suscripcion.toyotaplan.com.ar | - |
| corolla-cross-xli-20-cvt-70-30 | 105 | 115 | HOM | 582729.05 | ok | sdx.suscripcion.toyotaplan.com.ar | - |
| hiace-furgon-l2h2-28-tdi-at-plan-100 | 111 | 113 | HOM | 639161.64 | error | - | TOYOTA_PLAN_LINK_FAILED: Toyota Plan integration error |
| hilux-4x2-dc-dx-24-tdi-mt-70-30 | 96 | 108 | HOM | 414400.40 | ok | sdx.suscripcion.toyotaplan.com.ar | - |
| yaris-cross-xei-hev-15-ecvt-flex-plan-100 | 116 | 114 | HOM | 651441.37 | error | - | TOYOTA_PLAN_LINK_FAILED: Toyota Plan integration error |
| yaris-xs-15-cvt-5p-70-30 | 108 | 108 | HOM | 288034.53 | ok | sdx.suscripcion.toyotaplan.com.ar | - |
| yaris-xs-cvt-5p-flex-plan-100 | 113 | 113 | HOM | 322629.82 | error | - | TOYOTA_PLAN_LINK_FAILED: Toyota Plan integration error |
| corolla-20-xli-cvt-70-30 | 107 | 115 | HOM | 494777.57 | ok | sdx.suscripcion.toyotaplan.com.ar | - |

## Failed Items

- `hiace-furgon-l2h2-28-tdi-at-plan-100`: TOYOTA_PLAN_LINK_FAILED: Toyota Plan integration error
- `yaris-cross-xei-hev-15-ecvt-flex-plan-100`: TOYOTA_PLAN_LINK_FAILED: Toyota Plan integration error
- `yaris-xs-cvt-5p-flex-plan-100`: TOYOTA_PLAN_LINK_FAILED: Toyota Plan integration error

## Probable Cause Of Failed Items

En los tres casos fallidos, Toyota Plan sandbox devolvio una respuesta funcional negativa
sanitizada equivalente a:

`El valor de cuota 1 declarado para el modelo y plan no puede ser superior al valor de lista de TPA`

Interpretacion operativa:

- el backend HOMU respondio correctamente y mantuvo seller `HOM`;
- la autenticacion OAuth sandbox funciono;
- el rechazo parece venir por validacion de negocio del lado Toyota Plan para la
  combinacion `modelId + planId + amount`;
- no se observaron secretos, tokens ni links completos en la salida del smoke test.

## Follow-up

Para el siguiente paso de gestion funcional ver:

- [Toyota Plan Catalog Issues](./toyota-plan-catalog-issues.md)

Recomendacion actual:

- no modificar el catalogo local hasta recibir confirmacion oficial de Toyota Plan/TPA.
