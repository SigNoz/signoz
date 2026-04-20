# SigNoz Roles Listing - Comprehensive Test Plan

## Application Overview

The SigNoz Roles Listing feature is a role management and access control system that allows administrators to view and manage user roles within the organization. The feature is located under **Settings > Roles** and provides:

- **Role Display**: View all system and custom roles in a structured table format
- **Role Categorization**: Roles are organized into two sections - "Managed roles" (system-defined) and "Custom roles" (user-created)
- **Search Functionality**: Search roles by name or description
- **Pagination**: Efficiently navigate through large lists of roles with 20 roles per page
- **Role Information**: View role details including name, description, creation date, and last update
- **Access Control**: Only administrators can access the roles listing page

**Route**: `/settings/roles`

**API Endpoint**: `GET /api/v1/roles`

**Table Columns**:

- Name
- Description
- Updated At
- Created At

## User Role Permissions

- **@admin**: Can execute all test scenarios (full access to roles listing)
- **@editor**: Should NOT have access to the roles listing page
- **@viewer**: Should NOT have access to the roles listing page

## Test Scenarios

### 1. Navigation and Access Control

**Seed:** `tests/seed.spec.ts`

#### 1.1 Admin User Can Access Roles Page **[@admin]**

**Pre-conditions:**

- User is logged in as admin (handled by seed test)

**Steps:**

1. Login to SigNoz application as admin user
2. Navigate to "Settings" from the main navigation
3. Look for "Roles" option in settings sidebar
4. Click on "Roles" tab

**Expected Results:**

- "Roles" option is visible in settings sidebar for admin users
- Successfully navigates to `/settings/roles`
- Roles listing page loads without errors
- Page displays "Roles" heading
- URL updates to `/settings/roles`
- No access denied or permission errors occur

### 2. Page Layout and UI Components

**Seed:** `tests/seed.spec.ts`

#### 2.1 Verify Roles Listing Page Layout **[@admin]**

**Pre-conditions:**

- User is logged in as admin
- At least some roles exist in the system

**Steps:**

1. Navigate to `/settings/roles`
2. Observe page layout and components
3. Verify all UI elements are present and properly rendered

**Expected Results:**

- Page displays "Roles" heading at the top
- Search input field is visible with appropriate placeholder text
- Table header displays four columns: "Name", "Description", "Updated At", "Created At"
- Table columns are properly aligned and sized
- Section headers are displayed for "Managed roles" and "Custom roles" (if both types exist)
- If custom roles exist, section header shows count in format: "Custom roles 1" (with flexible spacing)
- Pagination controls are visible at the bottom (if more than 20 roles)
- Page maintains consistent SigNoz design system
- All text is readable and properly formatted

#### 2.2 Verify Table Structure **[@admin]**

**Steps:**

1. Navigate to roles listing page
2. Examine table structure and data presentation
3. Verify column alignment and data formatting

**Expected Results:**

- Each role displays in a separate row
- Name column shows role name or "—" if missing
- Description column shows role description or "—" if missing
- Description text is line-clamped with tooltip for longer text
- Updated At column shows formatted timestamp or "—"
- Created At column shows formatted timestamp or "—"
- Timestamps follow the format: YYYY-MM-DD HH:mm:ss (or user's timezone format)
- All rows are consistently formatted
- Table is responsive and scrollable if needed

### 3. Roles Display and Data Verification

**Seed:** `tests/seed.spec.ts`

#### 3.1 Verify API Response Matches UI Display **[@admin]**

**Pre-conditions:**

- Multiple roles exist in the system (both managed and custom)

**Steps:**

1. Intercept the API call to `GET /api/v1/roles`
2. Navigate to roles listing page
3. Compare API response data with displayed table content
4. Verify each role from API appears in the UI

**Expected Results:**

- API call to `/api/v1/roles` is successful (200 status)
- All roles from API response are displayed in the table
- API returns 5 roles total (4 managed + 1 custom)
- Role names match between API and UI
- Role descriptions match between API and UI
- Created/Updated timestamps match between API and UI
- Role types (managed vs custom) are correctly categorized
- Data integrity is maintained between backend and frontend
- No roles are missing or duplicated in the UI

#### 3.2 Verify Role Categorization (Managed vs Custom) **[@admin]**

**Pre-conditions:**

- System has both managed roles and custom roles

**Steps:**

1. Navigate to roles listing page
2. Observe role categorization and section headers
3. Verify roles appear under correct sections

**Expected Results:**

- "Managed roles" section appears first (if managed roles exist)
- All roles with `type: "managed"` appear under "Managed roles" section (signoz-admin, signoz-editor, signoz-viewer, signoz-anonymous)
- "Custom roles" section appears after managed roles (if custom roles exist)
- All roles with `type: "custom"` appear under "Custom roles" section (custom-role-ui)
- Custom roles section header shows count in format: "Custom roles 1" (with or without space between "roles" and the number)
- Managed roles section header does NOT show count
- Sections are visually distinct and well-organized
- No roles appear in wrong sections

### 4. Search Functionality

**Seed:** `tests/seed.spec.ts`

#### 4.1 Search Roles by Name **[@admin]**

**Pre-conditions:**

- Multiple roles exist with distinct names
- Example roles: "Admin", "Editor", "Viewer", "DevOps Engineer", "Security Analyst"

**Steps:**

1. Navigate to roles listing page
2. Enter a role name in the search box (e.g., "Admin")
3. Observe filtered results
4. Clear search and verify all roles reappear

**Expected Results:**

- Search filters roles in real-time as user types
- Only roles with names matching the search query are displayed
- Search is case-insensitive (searching "admin" matches "Admin")
- Partial matches are supported (searching "Dev" matches "DevOps Engineer")
- Roles that don't match are hidden
- Clearing search returns full list of roles
- Role categorization (managed/custom sections) is maintained in search results
- Pagination updates based on filtered results

#### 4.2 Search Roles by Description **[@admin]**

**Pre-conditions:**

- Roles have descriptive text in description field

**Steps:**

1. Navigate to roles listing page
2. Enter descriptive keywords in search box
3. Verify roles with matching descriptions appear

**Expected Results:**

- Search matches text in role descriptions
- Roles with matching description keywords are displayed
- Both name and description fields are searched simultaneously
- Search is case-insensitive for descriptions
- Partial matches work in descriptions
- Roles can be found by either name or description

#### 4.3 Search with No Results **[@admin]**

**Steps:**

1. Navigate to roles listing page
2. Enter search term that matches no roles (e.g., "NonExistentRole123")
3. Observe results

**Expected Results:**

- Empty state message displays: "No roles match your search."
- Message is different from general empty state ("No roles found.")
- No table rows are visible
- Search input remains functional
- User can clear search to return to full list
- No errors or broken UI elements
- Pagination is hidden when no results

#### 4.4 Search Case Sensitivity **[@admin]**

**Steps:**

1. Search using uppercase, lowercase, and mixed case
2. Verify search behavior across different cases

**Expected Results:**

- Search is consistently case-insensitive
- "ADMIN", "admin", "Admin" all return same results
- Case of search query doesn't affect results
- UI provides consistent search experience

### 5. Pagination Functionality

**Seed:** `tests/seed.spec.ts`

#### 5.1 Navigate Between Pages **[@admin]**

**Pre-conditions:**

- More than 20 roles exist in the system (to trigger multiple pages)

**Steps:**

1. Navigate to roles listing page
2. Verify pagination controls are visible at bottom
3. Note roles displayed on page 1
4. Click "Next" or page "2" in pagination
5. Observe roles on page 2
6. Click "Previous" or page "1"
7. Return to page 1

**Expected Results:**

- Pagination controls are visible when total roles > 20
- First page shows first 20 roles
- Second page shows next set of roles
- Page numbers are accurate and clickable
- Current page is highlighted/indicated
- Previous button is disabled on first page
- Next button is disabled on last page
- Clicking specific page numbers navigates correctly
- URL updates with page parameter: `?page=2`
- Roles don't duplicate across pages
- Section headers (Managed/Custom) appear appropriately on each page

#### 5.2 Pagination with Search Results **[@admin]**

**Steps:**

1. Perform search that yields more than 20 results
2. Verify pagination works with filtered results
3. Navigate between pages while search is active
4. Clear search and verify pagination resets

**Expected Results:**

- Pagination updates based on filtered result count
- Can navigate through multiple pages of search results
- Page numbers reflect filtered result count
- Clearing search resets pagination to full dataset
- Page parameter in URL persists during search
- Filtered results maintain proper section categorization

#### 5.3 Pagination State Persistence **[@admin]**

**Steps:**

1. Navigate to page 2 or 3
2. Refresh the browser
3. Verify page state is maintained

**Expected Results:**

- URL contains page parameter: `?page=2`
- After refresh, user remains on same page
- Page state persists across browser sessions
- Correct roles are displayed after refresh
- Pagination controls reflect current page

### 6. Loading and Error States

**Seed:** `tests/seed.spec.ts`

#### 6.1 Verify Loading State **[@admin]**

**Steps:**

1. Intercept API call to delay response
2. Navigate to roles listing page
3. Observe loading state behavior

**Expected Results:**

- Loading skeleton is displayed while fetching roles
- Skeleton shows placeholder for table structure
- Loading state includes animated placeholders
- Page remains functional during loading
- No content flashing or layout shifts
- Loading transitions smoothly to loaded state
- At least 5 skeleton rows are displayed

#### 6.2 Handle API Error State **[@admin]**

**Steps:**

1. Mock API to return error response (500, 503, etc.)
2. Navigate to roles listing page
3. Observe error handling

**Expected Results:**

- Error component is displayed: `ErrorInPlace`
- Error message is user-friendly and informative
- Default error message: "An unexpected error occurred while fetching roles."
- Specific API errors are handled appropriately
- Page layout remains intact during error state
- No application crash or white screen
- User understands what went wrong

#### 6.3 Handle Network Failure **[@admin]**

**Steps:**

1. Simulate network disconnection
2. Navigate to roles listing page
3. Observe behavior

**Expected Results:**

- Appropriate error message for network issues
- User is informed of network problem
- Page remains stable (no crash)
- Retry mechanism may be available (if implemented)
- Error is distinguishable from other errors

## Quality Standards

- **Reproducibility**: All scenarios can be executed independently and repeatedly
- **Clarity**: Steps are specific enough for any tester to follow without ambiguity
- **Coverage**: Scenarios cover happy path, edge cases, error conditions, and security aspects
- **Traceability**: Each test links back to specific roles listing functionality
- **Automation-Ready**: Steps are written to facilitate Playwright test automation

## Environment Setup

- **Prerequisites**: Valid SigNoz workspace with admin access
- **Test Data**: mix of managed and custom roles
- **User Accounts**: Test users with different permission levels (admin, editor, viewer)
- **Feature Flags**: `IS_ROLE_DETAILS_AND_CRUD_ENABLED` set appropriately for each test

## Success Criteria

- All role listing functionality works correctly for admin users
- Non-admin users are properly restricted from accessing roles page
- API data accurately reflects in the UI with proper formatting
- Search and pagination handle large datasets efficiently
- Loading and error states provide appropriate user feedback
- Accessibility standards are met for keyboard and screen reader users
- Security measures prevent unauthorized access and data exposure
- URL state synchronization works correctly with browser navigation
- Performance remains acceptable with 100+ roles
- Feature flag correctly controls role details navigation behavior

## Notes

- The roles listing is read-only (no CRUD operations in current scope)
- Role details page navigation is feature-flagged (currently disabled)
- API requires admin role authentication (SecuritySchemes: RoleAdmin)
- Pagination shows 20 roles per page (PAGE_SIZE constant)
- Role types are case-insensitive: "managed" and "custom"
- Timestamps use timezone-adjusted formatting based on user preferences
- Description field supports line-clamping with tooltip for long text
