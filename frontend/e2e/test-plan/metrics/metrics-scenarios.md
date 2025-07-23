# Metrics Module E2E Scenarios

## 1. View Metrics Summary

- **Precondition:** User is logged in, metrics are ingested
- **Steps:**
  1. Navigate to Metrics Summary
  2. Verify metrics are displayed
- **Expected:** Metrics summary is visible, data is present

## 2. Filter Metrics by Service/Type/Unit

- **Precondition:** User is logged in, metrics exist for multiple services/types/units
- **Steps:**
  1. Open filter panel
  2. Select filter(s)
  3. Apply filter
- **Expected:** Only matching metrics are shown

## 3. Explore Metrics in Explorer

- **Precondition:** User is logged in
- **Steps:**
  1. Navigate to Metrics Explorer
  2. Build custom metric queries
- **Expected:** Custom queries return expected results

## 4. Save a Metric View

- **Precondition:** User is logged in, has built a query
- **Steps:**
  1. Click 'Save View'
  2. Enter view name and save
- **Expected:** View is saved and appears in saved views list

## 5. Load a Saved Metric View

- **Precondition:** At least one saved view exists
- **Steps:**
  1. Open saved views
  2. Select a saved view
- **Expected:** Query and filters are restored as per saved view

## 6. Export Metrics

- **Precondition:** User is logged in, metrics are present
- **Steps:**
  1. Click 'Export' button
  2. Choose format (if applicable)
- **Expected:** Metrics are downloaded in selected format

## 7. Switch Metrics View Modes

- **Precondition:** User is logged in
- **Steps:**
  1. Switch between chart, table, and other views
- **Expected:** Metrics display updates to selected mode

## 8. Handle No Metrics State

- **Precondition:** No metrics ingested
- **Steps:**
  1. Navigate to Metrics Summary/Explorer
- **Expected:** Empty state message is shown

## 9. Handle Large Metrics Volume

- **Precondition:** Many metrics ingested
- **Steps:**
  1. Scroll/paginate through metrics
- **Expected:** Pagination/virtualization works, no performance issues

## 10. Cross-Module: Add Metric View to Dashboard

- **Precondition:** User is logged in, has a saved metric view
- **Steps:**
  1. Open saved metric view
  2. Click 'Add to Dashboard'
  3. Select dashboard and confirm
- **Expected:** Metric view appears as widget in selected dashboard
