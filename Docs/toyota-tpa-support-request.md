# Toyota/TPA Support Request

## Resumen Ejecutivo

Durante la validacion sandbox del backend adapter TPA-HOM se confirmo que el catalogo local
coincide con el Google Sheet publico de Toyota Plan para las 9 combinaciones disponibles.

Sin embargo, al ejecutar `generateLink` contra sandbox para esas mismas 9 combinaciones, Toyota
Plan devolvio rechazo funcional en todos los casos.

El problema parece ser un rechazo funcional generalizado del sandbox, no una desalineacion del
catalogo local.

## Estado Tecnico Del Adapter

- Ambiente utilizado: `sandbox`
- Seller utilizado por backend: `HOM`
- OAuth sandbox: operativo
- Scope configurado: `ext-link/write`
- Endpoint probado: `generatelink`
- Flujo de frontend/backend: el cliente envia solo `slug`; el backend resuelve internamente
  `modelId`, `planId`, `amount` y `seller`
- No se usaron credenciales productivas
- No se modifico el catalogo local
- No se almacenaron ni documentaron links completos generados

## Comparacion Google Sheet Vs Catalogo Local

Fuente Google Sheet publica:

```txt
https://docs.google.com/spreadsheets/d/1F4kUAccg2aS2iGfyYkGXzAhAARy0SErQdlvT3NS-sGo
```

Resultado de `npm run catalog:compare-sheet`:

- total_rows_sheet: 9
- total_items_catalog: 9
- exact_amount_matches: 9
- amount_differences: 0
- sheet_only_items: 0
- catalog_only_items: 0
- possible_description_differences: 0

Conclusion: los `AMOUNT` del Sheet coinciden con `src/config/toyota-plan.catalog.json`.

## Resultado Smoke Sheet Sandbox

Resultado de `npm run smoke:sheet`:

- total_rows: 9
- ok_count: 0
- reject_count: 9
- upstream_transient_count: 0
- timeout_count: 0
- other_count: 0

Mensaje comun sanitizado:

```txt
Tuvimos un inconveniente verificando los datos ingresados
```

No hubo errores upstream `502/503/504` ni timeouts. Todos los casos fueron clasificados por el
adapter como `TOYOTA_PLAN_LINK_REJECTED`.

## Combinaciones Probadas

| modelId | planId | amount | slug | status | code | detalle sanitizado |
|---|---|---:|---|---|---|---|
| 114 | 113 | 558824.14 | hilux-4x4-dc-dx-24-tdi-at-plan-100 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 115 | 115 | 465393.18 | yaris-cross-xli-15-cvt-flex-70-30 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 105 | 115 | 582729.05 | corolla-cross-xli-20-cvt-70-30 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 111 | 113 | 639161.64 | hiace-furgon-l2h2-28-tdi-at-plan-100 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 96 | 108 | 414400.40 | hilux-4x2-dc-dx-24-tdi-mt-70-30 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 116 | 114 | 651441.37 | yaris-cross-xei-hev-15-ecvt-flex-plan-100 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 108 | 108 | 288034.53 | yaris-xs-15-cvt-5p-70-30 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 113 | 113 | 322629.82 | yaris-xs-cvt-5p-flex-plan-100 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |
| 107 | 115 | 494777.57 | corolla-20-xli-cvt-70-30 | rejected | TOYOTA_PLAN_LINK_REJECTED | Tuvimos un inconveniente verificando los datos ingresados |

## Preguntas Para Toyota/TPA

1. ¿El seller `HOM` esta habilitado en sandbox para generar links externos de suscripcion digital?
2. ¿Las credenciales sandbox entregadas estan asociadas al seller `HOM`?
3. ¿El scope `ext-link/write` es suficiente para el endpoint `generatelink` en sandbox?
4. ¿El catalogo de modelos, planes y amounts del Google Sheet esta cargado y vigente en sandbox?
5. ¿Los `AMOUNT` del Sheet corresponden a sandbox o a produccion?
6. ¿Que significa exactamente el mensaje `Tuvimos un inconveniente verificando los datos ingresados`?
7. ¿Hay alguna validacion adicional no documentada para `modelId`, `planId`, `amount` o `seller`?
8. ¿Cual es una combinacion minima `modelId + planId + amount + seller` que deberia funcionar hoy en sandbox?
9. ¿Existe algun estado de habilitacion por plan/modelo para `HOM` que debamos verificar?

## Texto Sugerido Para Enviar

Hola equipo Toyota/TPA,

Estamos validando el adapter de HOMU S.A. para Suscripcion Digital Toyota Plan en ambiente
sandbox.

Confirmamos que OAuth funciona correctamente y que el catalogo local coincide 9/9 con el Google
Sheet publico provisto para `modelId`, `planId` y `amount`. Sin embargo, al ejecutar `generatelink`
para las 9 combinaciones, sandbox devuelve rechazo funcional en todos los casos con el mensaje:

```txt
Tuvimos un inconveniente verificando los datos ingresados
```

No observamos errores upstream, timeouts ni problemas de autenticacion. El comportamiento parece
ser un rechazo funcional generalizado del sandbox, no una diferencia entre catalogo local y Sheet.

¿Podrian confirmar si el seller `HOM`, las credenciales sandbox, el scope `ext-link/write` y las
combinaciones del Google Sheet estan habilitadas para `generatelink` en sandbox? Tambien nos seria
util contar con una combinacion minima que deba funcionar hoy para validar punta a punta.

Por seguridad no incluimos credenciales, tokens, headers Authorization ni links completos.

Gracias.

## Seguridad

Este documento no incluye:

- `client_id`
- `client_secret`
- `access_token`
- `Authorization`
- `Bearer token`
- links completos generados
- contenido de `.env`

Solo se documentan datos funcionales necesarios para diagnostico: `modelId`, `planId`, `amount`,
`slug`, codigo de clasificacion y mensaje sanitizado.

## Referencias Internas

- `Docs/catalog-sheet-compare-report.md`
- `Docs/sheet-smoke-report.md`
- `Docs/sandbox-test-log.md`
