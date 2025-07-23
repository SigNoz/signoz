# Dashboards Module E2E Scenarios

## 1. List All Dashboards

- **Precondition:** User is logged in
- **Steps:**
  1. Navigate to Dashboards
  2. Verify list of dashboards is displayed
- **Expected:** Dashboards list is visible

## 2. Search and Filter Dashboards

- **Precondition:** Multiple dashboards exist
- **Steps:**
  1. Enter search term or apply filter
- **Expected:** Only matching dashboards are shown

## 3. Create New Dashboard (Scratch/Template)

- **Precondition:** User is logged in
- **Steps:**
  1. Click 'Create Dashboard'
  2. Enter details or select template
  3. Save dashboard
- **Expected:** New dashboard appears in list

## 4. Edit Dashboard

- **Precondition:** At least one dashboard exists
- **Steps:**
  1. Open dashboard
  2. Edit details/widgets
  3. Save changes
- **Expected:** Changes are reflected in dashboard

## 5. Delete Dashboard

- **Precondition:** At least one dashboard exists
- **Steps:**
  1. Open dashboard
  2. Click 'Delete'
  3. Confirm deletion
- **Expected:** Dashboard is removed from list

## 6. Add/Edit/Delete Widgets

- **Precondition:** Dashboard exists
- **Steps:**
  1. Add new widget (log/trace/metric view)
  2. Edit or delete widget
- **Expected:** Widgets are added, updated, or removed

## 7. Share Dashboard

- **Precondition:** Dashboard exists
- **Steps:**
  1. Click 'Share'
  2. Copy/share link
- **Expected:** Shareable link is generated

## 8. View Dashboard Details

- **Precondition:** Dashboard exists
- **Steps:**
  1. Open dashboard
- **Expected:** Details and widgets are displayed

## 9. Pagination Through Dashboards

- **Precondition:** Many dashboards exist
- **Steps:**
  1. Scroll or paginate through list
- **Expected:** Pagination works, no performance issues

## 10. Cross-Module: Add View to Dashboard

- **Precondition:** Saved log/trace/metric view exists
- **Steps:**
  1. Add view to dashboard as widget
- **Expected:** Widget appears in dashboard
