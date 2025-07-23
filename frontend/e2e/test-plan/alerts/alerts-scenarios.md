# Alerts Module E2E Scenarios

## 1. View Alert Rules

- **Precondition:** User is logged in
- **Steps:**
  1. Navigate to Alerts
  2. Verify alert rules are listed
- **Expected:** Alert rules list is visible

## 2. Search and Filter Alert Rules

- **Precondition:** Multiple alert rules exist
- **Steps:**
  1. Enter search/filter criteria
- **Expected:** Only matching alert rules are shown

## 3. Create New Alert Rule

- **Precondition:** User is logged in
- **Steps:**
  1. Click 'Create Alert Rule'
  2. Fill details and save
- **Expected:** New alert rule appears in list

## 4. Edit Alert Rule

- **Precondition:** At least one alert rule exists
- **Steps:**
  1. Open alert rule
  2. Edit details
  3. Save changes
- **Expected:** Changes are reflected in alert rule

## 5. Delete Alert Rule

- **Precondition:** At least one alert rule exists
- **Steps:**
  1. Open alert rule
  2. Click 'Delete'
  3. Confirm deletion
- **Expected:** Alert rule is removed from list

## 6. Enable/Disable Alert Rule

- **Precondition:** Alert rule exists
- **Steps:**
  1. Toggle enable/disable
- **Expected:** Status updates accordingly

## 7. View Alert Rule Status/Details

- **Precondition:** Alert rule exists
- **Steps:**
  1. Open alert rule details
- **Expected:** Status and details are displayed

## 8. View Triggered Alerts

- **Precondition:** Triggered alerts exist
- **Steps:**
  1. Navigate to Triggered Alerts tab
- **Expected:** Triggered alerts are listed

## 9. Acknowledge/Resolve Triggered Alert

- **Precondition:** Triggered alert exists
- **Steps:**
  1. Open triggered alert
  2. Acknowledge or resolve
- **Expected:** Status updates accordingly

## 10. Configure Alert Settings

- **Precondition:** User is logged in
- **Steps:**
  1. Open alert configuration
  2. Update settings
- **Expected:** Settings are saved and applied
