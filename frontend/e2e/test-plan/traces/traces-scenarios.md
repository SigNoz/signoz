# Traces Module E2E Scenarios

## 1. View Traces in Explorer

- **Precondition:** User is logged in, traces are ingested
- **Steps:**
  1. Navigate to Traces Explorer
  2. Verify traces are displayed in the table
- **Expected:** Traces table is visible, data is present

## 2. Filter Traces by Attributes

- **Precondition:** User is logged in, traces exist for multiple services/attributes
- **Steps:**
  1. Open filter panel
  2. Select attribute(s) (e.g., service, error, duration)
  3. Apply filter
- **Expected:** Only matching traces are shown

## 3. Search Traces by Keyword

- **Precondition:** User is logged in, traces contain searchable text
- **Steps:**
  1. Enter keyword in search bar
  2. Submit search
- **Expected:** Only traces containing the keyword are shown

## 4. Save a Trace View

- **Precondition:** User is logged in, has applied filters/search
- **Steps:**
  1. Click 'Save View'
  2. Enter view name and save
- **Expected:** View is saved and appears in saved views list

## 5. Load a Saved Trace View

- **Precondition:** At least one saved view exists
- **Steps:**
  1. Open saved views
  2. Select a saved view
- **Expected:** Filters/search are restored as per saved view

## 6. Export Traces

- **Precondition:** User is logged in, traces are present
- **Steps:**
  1. Click 'Export' button
  2. Choose format (if applicable)
- **Expected:** Traces are downloaded in selected format

## 7. Switch Trace View Modes

- **Precondition:** User is logged in
- **Steps:**
  1. Switch between list, time series, and table views
- **Expected:** Trace display updates to selected mode

## 8. Create Alert from Traces

- **Precondition:** User is logged in, has filtered traces
- **Steps:**
  1. Click 'Create Alert' from traces view
  2. Fill alert details and save
- **Expected:** Alert is created and appears in alerts list

## 9. Handle No Traces State

- **Precondition:** No traces ingested
- **Steps:**
  1. Navigate to Traces Explorer
- **Expected:** Empty state message is shown

## 10. Handle Large Trace Volume

- **Precondition:** Many traces ingested
- **Steps:**
  1. Scroll/paginate through traces
- **Expected:** Pagination/virtualization works, no performance issues

## 11. Funnels: Create/Edit/Delete Funnel

- **Precondition:** User is logged in
- **Steps:**
  1. Navigate to Funnels tab
  2. Create a new funnel
  3. Edit and delete funnel
- **Expected:** Funnel is created, updated, and removed as expected

## 12. Cross-Module: Add Trace View to Dashboard

- **Precondition:** User is logged in, has a saved trace view
- **Steps:**
  1. Open saved trace view
  2. Click 'Add to Dashboard'
  3. Select dashboard and confirm
- **Expected:** Trace view appears as widget in selected dashboard
