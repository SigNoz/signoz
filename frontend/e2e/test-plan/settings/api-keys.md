# API Keys E2E Scenarios (Updated)

## 1. Create a New API Key

- **Precondition:** User is admin
- **Steps:**
  1. Click 'New Key' button
  2. Enter details in the modal/dialog
  3. Click 'Save'
- **Expected:** API key is created and listed in the table

## 2. Revoke an API Key

- **Precondition:** API key exists
- **Steps:**
  1. In the table, locate the API key row
  2. Click the revoke/delete button (icon button in the Action column)
  3. Confirm if prompted
- **Expected:** API key is revoked/removed from the table

## 3. View API Key Usage

- **Precondition:** API key exists
- **Steps:**
  1. View the 'Last used' and 'Expired' columns in the table
- **Expected:** Usage data is displayed for each API key
