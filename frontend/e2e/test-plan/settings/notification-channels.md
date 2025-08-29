# Notification Channels E2E Scenarios (Updated)

## 1. Add a New Notification Channel

- **Precondition:** User is admin
- **Steps:**
  1. Click 'New Alert Channel' button
  2. In the 'New Notification Channel' form, fill in required fields (Name, Type, Webhook URL, etc.)
  3. (Optional) Toggle 'Send resolved alerts'
  4. (Optional) Click 'Test' to send a test notification
  5. Click 'Save' to add the channel
- **Expected:** Channel is added and listed in the table

## 2. Test Notification Channel

- **Precondition:** Channel is being created or edited
- **Steps:**
  1. In the 'New Notification Channel' or 'Edit Notification Channel' form, click 'Test'
- **Expected:** Test notification is sent (UI feedback/confirmation should be checked)

## 3. Remove a Notification Channel

- **Precondition:** Channel is added
- **Steps:**
  1. In the table, locate the channel row
  2. Click 'Delete' in the Action column
  3. Confirm removal if prompted
- **Expected:** Channel is removed from the table

## 4. Update Notification Channel Settings

- **Precondition:** Channel is added
- **Steps:**
  1. In the table, locate the channel row
  2. Click 'Edit' in the Action column
  3. In the 'Edit Notification Channel' form, update fields as needed
  4. (Optional) Click 'Test' to send a test notification
  5. Click 'Save' to update the channel
- **Expected:** Settings are updated
