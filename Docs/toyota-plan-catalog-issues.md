# Toyota Plan Catalog Issues

## v0.5.2 - Resolucion de inconsistencias de catalogo TPA

## Resumen ejecutivo

El adapter `TPA-HOM` se encuentra validado tecnicamente en sandbox: OAuth funciona, el
endpoint `generateLink` funciona, el seller `HOM` funciona y la integracion backend de
HOMU responde correctamente.

Durante la validacion controlada del catalogo actual contra Toyota Plan sandbox se
obtuvieron `6` slugs exitosos y `3` slugs fallidos. La evidencia observada sugiere que
los fallidos no se deben a un problema del adapter, sino a una inconsistencia o rechazo
funcional del lado Toyota Plan/TPA para ciertas combinaciones de `modelId`, `planId` y
`amount`.

Recomendacion actual: **no modificar el catalogo local todavia**. Esperar confirmacion
oficial de Toyota Plan/TPA sobre los tres casos fallidos.

## Estado tecnico del adapter

- backend validado en `sandbox`;
- OAuth sandbox operativo;
- `POST /api/toyota-plan/generate-link` operativo;
- seller `HOM` operativo;
- validacion de host activa para `sdx.suscripcion.toyotaplan.com.ar`;
- smoke test del catalogo ejecutado con el service real;
- no se expusieron credenciales, tokens ni links completos.

## Resultado del smoke test

- fecha de referencia: `2026-05-21`
- ambiente: `sandbox`
- items habilitados probados: `9`
- exitosos: `6`
- fallidos: `3`

## Slugs exitosos

| slug | modelId | modelDescription | planId | planDescription | seller | amount | resultado |
|---|---:|---|---:|---|---|---:|---|
| hilux-4x4-dc-dx-24-tdi-at-plan-100 | 114 | HILUX 4X4 D/C DX 2.4 TDI 6 A/T | 113 | PLAN 100% DIF G 84M | HOM | 558824.14 | link generado |
| yaris-cross-xli-15-cvt-flex-70-30 | 115 | YARIS CROSS XLI 1.5 CVT FLEX | 115 | 70/30 84 M DIF H | HOM | 465393.18 | link generado |
| corolla-cross-xli-20-cvt-70-30 | 105 | COROLLA CROSS XLI 2.0 CVT | 115 | 70/30 84 M DIF H | HOM | 582729.05 | link generado |
| hilux-4x2-dc-dx-24-tdi-mt-70-30 | 96 | HILUX 4X2 D/C DX 2.4 TDI 6 M/T | 108 | 70/30 DIF G 84 MESES | HOM | 414400.40 | link generado |
| yaris-xs-15-cvt-5p-70-30 | 108 | YARIS XS 1.5 CVT 5P | 108 | 70/30 DIF G 84 MESES | HOM | 288034.53 | link generado |
| corolla-20-xli-cvt-70-30 | 107 | COROLLA 2.0 XLI CVT | 115 | 70/30 84 M DIF H | HOM | 494777.57 | link generado |

## Slugs fallidos

| slug | modelId | modelDescription | planId | planDescription | seller | amount probado | error sanitizado / causa probable |
|---|---:|---|---:|---|---|---:|---|
| hiace-furgon-l2h2-28-tdi-at-plan-100 | 111 | HIACE FURGON L2H2 2.8 TDI 6AT 3A 5P | 113 | PLAN 100% DIF G 84M | HOM | 639161.64 | rechazo funcional TPA: el valor declarado de cuota 1 supera el valor de lista |
| yaris-cross-xei-hev-15-ecvt-flex-plan-100 | 116 | YARIS CROSS XEI HEV 1.5 ECVT FLEX | 114 | 100% 84 M DIF H | HOM | 651441.37 | rechazo funcional TPA: el valor declarado de cuota 1 supera el valor de lista |
| yaris-xs-cvt-5p-flex-plan-100 | 113 | YARIS XS CVT 5P FLEX | 113 | PLAN 100% DIF G 84M | HOM | 322629.82 | rechazo funcional TPA: el valor declarado de cuota 1 supera el valor de lista |

## Causa probable de fallidos

La causa mas probable es una inconsistencia entre el catalogo local actual y la validacion
de negocio vigente en Toyota Plan sandbox para alguno de estos componentes:

- valor de `amount`;
- habilitacion real del `planId` para el `modelId`;
- valor de lista actualizado del modelo en TPA;
- configuracion comercial disponible para seller `HOM`.

En todos los fallidos se mantuvo el mismo patron:

- el adapter autentico correctamente;
- el adapter llamo correctamente a `generateLink`;
- Toyota Plan respondio con rechazo funcional de negocio;
- no hubo evidencia de fallo de credenciales, seller ni host.

## Preguntas para Toyota Plan / TPA

1. Para los slugs fallidos, ¿los `modelId` y `planId` siguen vigentes en sandbox para seller `HOM`?
2. ¿Los valores de `amount` informados son correctos o deben actualizarse?
3. ¿Existe un valor de cuota 1 maximo esperado actualmente para esos modelos/planes?
4. ¿La configuracion `PLAN 100% DIF G 84M` y `100% 84 M DIF H` sigue habilitada para esos casos?
5. ¿Hay diferencias conocidas entre el catalogo comercial entregado y la validacion vigente en sandbox?
6. ¿Toyota/TPA puede compartir una matriz oficial actualizada de `modelId + planId + amount + seller` valida para sandbox?

## Texto sugerido para enviar a Toyota / TPA

```txt
Hola equipo,

Estamos validando en sandbox la integracion de HOMU con Suscripcion Digital Toyota Plan.
El adapter backend funciona correctamente a nivel tecnico: autenticacion OAuth, seller HOM,
host sandbox y generacion de links para la mayoria de los casos.

En una corrida controlada del catalogo actual obtuvimos 6 casos exitosos y 3 casos con
rechazo funcional. En los tres fallidos Toyota Plan sandbox respondio con un mensaje
equivalente a que el valor declarado de cuota 1 supera el valor de lista de TPA.

Necesitamos confirmar si las siguientes combinaciones siguen vigentes en sandbox para
seller HOM o si debemos actualizar amount / modelId / planId:

- hiace-furgon-l2h2-28-tdi-at-plan-100 -> modelId 111 / planId 113 / amount 639161.64
- yaris-cross-xei-hev-15-ecvt-flex-plan-100 -> modelId 116 / planId 114 / amount 651441.37
- yaris-xs-cvt-5p-flex-plan-100 -> modelId 113 / planId 113 / amount 322629.82

Si es posible, agradeceriamos una confirmacion oficial del catalogo valido en sandbox para
seller HOM, incluyendo modelId, planId y amount esperados.

Muchas gracias.
```

## Reglas de seguridad

- no incluir credenciales;
- no incluir `client_id` ni `client_secret`;
- no incluir tokens OAuth;
- no incluir headers `Authorization`;
- no incluir links completos generados;
- no copiar el contenido de `.env` en tickets o correos.

## Recomendacion operativa

Hasta recibir confirmacion oficial de Toyota Plan/TPA:

- no cambiar el catalogo local;
- no deshabilitar automaticamente los slugs fallidos;
- no pasar esos tres casos a produccion;
- seguir usando sandbox para validacion de catalogo;
- conservar este documento como referencia funcional de `v0.5.2`.
