# Logs Module E2E Scenarios

## 1. View Logs in Explorer

- **Precondition:** User is logged in, logs are ingested
- **Steps:**
  1. Navigate to Logs Explorer
  2. Verify logs are displayed in the table
- **Expected:** Logs table is visible, data is present

## 2. Filter Logs by Service/Severity/Time

- **Precondition:** User is logged in, logs exist for multiple services/severities
- **Steps:**
  1. Open filter panel
  2. Select a service/severity/time range
  3. Apply filter
- **Expected:** Only matching logs are shown

## 3. Search Logs by Keyword

- **Precondition:** User is logged in, logs contain searchable text
- **Steps:**
  1. Enter keyword in search bar
  2. Submit search
- **Expected:** Only logs containing the keyword are shown

## 4. Save a Log View

- **Precondition:** User is logged in, has applied filters/search
- **Steps:**
  1. Click 'Save View'
  2. Enter view name and save
- **Expected:** View is saved and appears in saved views list

## 5. Load a Saved Log View

- **Precondition:** At least one saved view exists
- **Steps:**
  1. Open saved views
  2. Select a saved view
- **Expected:** Filters/search are restored as per saved view

## 6. Export Logs

- **Precondition:** User is logged in, logs are present
- **Steps:**
  1. Click 'Export' button
  2. Choose format (if applicable)
- **Expected:** Logs are downloaded in selected format

## 7. Switch Log View Modes

- **Precondition:** User is logged in
- **Steps:**
  1. Switch between list, time series, and table views
- **Expected:** Log display updates to selected mode

## 8. Create Alert from Logs

- **Precondition:** User is logged in, has filtered logs
- **Steps:**
  1. Click 'Create Alert' from logs view
  2. Fill alert details and save
- **Expected:** Alert is created and appears in alerts list

## 9. Handle No Logs State

- **Precondition:** No logs ingested
- **Steps:**
  1. Navigate to Logs Explorer
- **Expected:** Empty state message is shown

## 10. Handle Large Log Volume

- **Precondition:** Many logs ingested
- **Steps:**
  1. Scroll/paginate through logs
- **Expected:** Pagination/virtualization works, no performance issues

## 11. Cross-Module: Add Log View to Dashboard

- **Precondition:** User is logged in, has a saved log view
- **Steps:**
  1. Open saved log view
  2. Click 'Add to Dashboard'
  3. Select dashboard and confirm
- **Expected:** Log view appears as widget in selected dashboard
