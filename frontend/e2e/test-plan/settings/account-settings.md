# Account Settings E2E Scenarios (Updated)

## 1. Update Name

- **Precondition:** User is logged in
- **Steps:**
  1. Click 'Update name' button
  2. Edit name field in the modal/dialog
  3. Save changes
- **Expected:** Name is updated in the UI

## 2. Update Email

- **Note:** The email field is not editable in the current UI.

## 3. Reset Password

- **Precondition:** User is logged in
- **Steps:**
  1. Click 'Reset password' button
  2. Complete reset flow (modal/dialog or external flow)
- **Expected:** Password is reset

## 4. Toggle 'Adapt to my timezone'

- **Precondition:** User is logged in
- **Steps:**
  1. Toggle 'Adapt to my timezone' switch
- **Expected:** Timezone adapts accordingly (UI feedback/confirmation should be checked)

## 5. Toggle Theme (Dark/Light)

- **Precondition:** User is logged in
- **Steps:**
  1. Toggle theme radio buttons ('Dark', 'Light Beta')
- **Expected:** Theme changes

## 6. Toggle Sidebar Always Open

- **Precondition:** User is logged in
- **Steps:**
  1. Toggle 'Keep the primary sidebar always open' switch
- **Expected:** Sidebar remains open/closed as per toggle
