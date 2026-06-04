# Google Sheet Sandbox Smoke Report

## Last Run

- executed_at: 2026-06-04T14:07:30.345Z
- environment: sandbox
- source: Google Sheet public CSV
- delay_ms: 500
- total_rows: 9
- ok_count: 0
- reject_count: 9
- upstream_transient_count: 0
- timeout_count: 0
- other_count: 0

## Scope

This report validates Google Sheet rows against Toyota Plan sandbox through the existing backend
service flow. It does not modify the local catalog, credentials, environment variables, or
production configuration.

## Executive Finding

The adapter reached Toyota Plan sandbox successfully and received functional rejections for all
9 tested combinations.

- OAuth is working.
- The Google Sheet matches the local catalog for the tested amounts.
- No upstream/transient errors were observed.
- No generateLink timeouts were observed.
- The common sanitized rejection message was:

```txt
Tuvimos un inconveniente verificando los datos ingresados
```

Current evidence suggests a generalized sandbox functional rejection rather than a local catalog
desynchronization.

## Results

| modelId | planId | amount | slug | status | code | linkHost | durationMs | detail |
|---|---|---:|---|---|---|---|---:|---|
| 114 | 113 | 558824.14 | hilux-4x4-dc-dx-24-tdi-at-plan-100 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 14806 | Tuvimos un inconveniente verificando los datos ingresados |
| 115 | 115 | 465393.18 | yaris-cross-xli-15-cvt-flex-70-30 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 443 | Tuvimos un inconveniente verificando los datos ingresados |
| 105 | 115 | 582729.05 | corolla-cross-xli-20-cvt-70-30 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 727 | Tuvimos un inconveniente verificando los datos ingresados |
| 111 | 113 | 639161.64 | hiace-furgon-l2h2-28-tdi-at-plan-100 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 410 | Tuvimos un inconveniente verificando los datos ingresados |
| 96 | 108 | 414400.40 | hilux-4x2-dc-dx-24-tdi-mt-70-30 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 696 | Tuvimos un inconveniente verificando los datos ingresados |
| 116 | 114 | 651441.37 | yaris-cross-xei-hev-15-ecvt-flex-plan-100 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 694 | Tuvimos un inconveniente verificando los datos ingresados |
| 108 | 108 | 288034.53 | yaris-xs-15-cvt-5p-70-30 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 410 | Tuvimos un inconveniente verificando los datos ingresados |
| 113 | 113 | 322629.82 | yaris-xs-cvt-5p-flex-plan-100 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 691 | Tuvimos un inconveniente verificando los datos ingresados |
| 107 | 115 | 494777.57 | corolla-20-xli-cvt-70-30 | TOYOTA_PLAN_LINK_REJECTED | TOYOTA_PLAN_LINK_REJECTED | - | 688 | Tuvimos un inconveniente verificando los datos ingresados |

## Security Notes

- Full generated links are not stored.
- Tokens, Authorization headers, Bearer values, client_id and client_secret are not stored.
- Only linkHost is kept for successful responses.
