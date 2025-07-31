# Ingestion E2E Scenarios

## 1. View Ingestion Settings Page

- **Precondition:** User is logged in and has admin/editor role
- **Steps:**
  1. Navigate to Settings page
  2. Click on "Ingestion" tab in the settings sidebar
- **Expected:** 
  - Page displays "Ingestion Keys" heading
  - Shows subtitle "Create and manage ingestion keys for the SigNoz Cloud"
  - Displays ingestion URL and region information (if available)
  - Shows search box for ingestion keys
  - Shows "New Ingestion key" button

## 2. Search Ingestion Keys

- **Precondition:** User is on the Ingestion Settings page
- **Steps:**
  1. Enter text in the search box
  2. Wait for search results to update
- **Expected:** Table filters to show only matching ingestion keys

## 3. Create New Ingestion Key

- **Precondition:** User is on the Ingestion Settings page
- **Steps:**
  1. Click "New Ingestion key" button
  2. Fill in the name field (minimum 6 characters, alphanumeric with underscores/hyphens)
  3. Set expiration date
  4. Add optional tags
  5. Click "Create new Ingestion key" button
- **Expected:** 
  - New ingestion key is created
  - Success notification is shown
  - New key appears in the table

## 4. Edit Ingestion Key

- **Precondition:** User is on the Ingestion Settings page with existing ingestion keys
- **Steps:**
  1. Click the edit (pen) icon for an existing ingestion key
  2. Modify tags or expiration date
  3. Click "Update Ingestion Key" button
- **Expected:** 
  - Ingestion key is updated
  - Success notification is shown
  - Changes are reflected in the table

## 5. Delete Ingestion Key

- **Precondition:** User is on the Ingestion Settings page with existing ingestion keys
- **Steps:**
  1. Click the delete (trash) icon for an existing ingestion key
  2. Confirm deletion in the modal
  3. Click "Delete Ingestion Key" button
- **Expected:** 
  - Ingestion key is deleted
  - Success notification is shown
  - Key is removed from the table

## 6. Copy Ingestion Key Value

- **Precondition:** User is on the Ingestion Settings page with existing ingestion keys
- **Steps:**
  1. Click the copy icon next to an ingestion key value
- **Expected:** 
  - Key value is copied to clipboard
  - Success notification is shown

## 7. Copy Ingestion URL and Region

- **Precondition:** User is on the Ingestion Settings page with deployment data available
- **Steps:**
  1. Click on the ingestion URL to copy it
  2. Click on the region name to copy it
- **Expected:** 
  - Respective values are copied to clipboard
  - Success notification is shown

## 8. Manage Ingestion Key Limits - Pending

- **Precondition:** User is on the Ingestion Settings page with existing ingestion keys
- **Steps:**
  1. Expand an ingestion key to view its details
  2. For each signal (logs, traces, metrics):
     - Click "Limits" button to add limits
     - Or click edit/delete icons to modify existing limits
     - Configure daily and per-second limits
     - Save or cancel changes
- **Expected:** 
  - Limits are properly configured for each signal
  - Success notifications are shown for successful operations

## 9. Pagination

- **Precondition:** User is on the Ingestion Settings page with multiple ingestion keys
- **Steps:**
  1. Navigate through pagination controls
- **Expected:** 
  - Different pages of ingestion keys are displayed
  - Pagination information shows correct totals
