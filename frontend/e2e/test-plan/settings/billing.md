# Billing Settings E2E Scenarios (Updated)

## 1. View Billing Information

- **Precondition:** User is admin
- **Steps:**
  1. Navigate to Billing Settings
  2. Wait for the billing chart/data to finish loading
- **Expected:**
  - Billing heading and subheading are displayed
  - Usage/cost table is visible with columns: Unit, Data Ingested, Price per Unit, Cost (Billing period to date)
  - "Download CSV" and "Manage Billing" buttons are present and enabled after loading
  - Test clicking "Download CSV" and "Manage Billing" for expected behavior (e.g., file download, navigation, or modal)

> Note: If these features are expected to trigger specific flows, document the observed behavior for each button.


