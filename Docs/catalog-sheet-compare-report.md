# Catalog vs Google Sheet Compare Report

## Last Run

- executed_at: 2026-06-04T14:03:53.854Z
- source: Google Sheet public CSV
- local_catalog: src/config/toyota-plan.catalog.json
- total_rows_sheet: 9
- total_items_catalog: 9
- exact_amount_matches: 9
- amount_differences: 0
- sheet_only_items: 0
- catalog_only_items: 0
- possible_description_differences: 0

## Scope

This report is read-only. It does not modify the local catalog, credentials, environment
variables, or Toyota Plan integration behavior.

## Executive Finding

The Google Sheet and the local catalog are aligned for the 9 tested combinations.

- No amount differences were detected.
- No sheet-only items were detected.
- No catalog-only items were detected.
- No description differences were detected.

This means the current sandbox rejection observed in `smoke:sheet` does not appear to be caused
by a local catalog mismatch against the public Google Sheet.

## Amount Differences

| key | slug | local_amount | sheet_amount | difference_sheet_minus_local | description |
|---|---|---:|---:|---:|---|
| - | - | - | - | - | - |


## Items In Sheet Not Found In Catalog

| key | sheet_model | sheet_plan | sheet_amount |
|---|---|---|---:|
| - | - | - | - |


## Items In Catalog Not Found In Sheet

| key | slug | local_model | local_amount |
|---|---|---|---:|
| - | - | - | - |


## Possible Description Differences

| key | slug | local_model | sheet_model | local_plan / sheet_plan |
|---|---|---|---|---|
| - | - | - | - | - |


## Recommendation

Do not update `src/config/toyota-plan.catalog.json` based on this comparison, because no
differences were found. The current evidence points to a generalized sandbox functional rejection,
not a local catalog alignment issue.
