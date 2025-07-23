# Services Module E2E Scenarios

## 1. View List of Services

- **Precondition:** User is logged in, services are present
- **Steps:**
  1. Navigate to Services
  2. Verify list of services is displayed
- **Expected:** Services list is visible

## 2. Filter/Search Services

- **Precondition:** Multiple services exist
- **Steps:**
  1. Enter search/filter criteria
- **Expected:** Only matching services are shown

## 3. View Service Metrics

- **Precondition:** Service exists
- **Steps:**
  1. Click on a service
  2. View metrics
- **Expected:** Service metrics are displayed

## 4. View Top-Level Operations

- **Precondition:** Service exists
- **Steps:**
  1. Click on a service
  2. Navigate to top-level operations
- **Expected:** Top-level operations are displayed

## 5. Handle No Services State

- **Precondition:** No services present
- **Steps:**
  1. Navigate to Services
- **Expected:** Empty state message is shown

## 6. Permission Checks

- **Precondition:** User has different roles (admin/editor/viewer)
- **Steps:**
  1. Attempt restricted actions as each role
- **Expected:** Permissions are enforced correctly
