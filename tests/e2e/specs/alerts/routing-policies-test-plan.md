# SigNoz Routing Policies - Comprehensive Test Plan

## Application Overview

The SigNoz Routing Policies feature is an alert routing and notification management system that allows users to define rules for routing alerts to specific notification channels based on alert attributes and conditions. The feature is located under **Alerts > Configuration > Routing Policies** and provides:

- **Policy Management**: Create, view, edit, and delete routing policies
- **Expression-Based Routing**: Define complex routing conditions using expressions
- **Notification Channel Integration**: Route alerts to configured notification channels
- **Search and Pagination**: Efficiently manage multiple policies
- **Real-time Validation**: Validate expressions and policy configurations

## User Role Permissions

- **@admin**: Can execute all test scenarios (create, edit, delete, view)
- **@editor**: Can execute editor and viewer test scenarios (create, edit, view)
- **@viewer**: Can only execute viewer test scenarios (view only)

## Test Scenarios

### 1. Navigation and Page Layout **[@viewer]**

**Seed:** `tests/seed.spec.ts`

#### 1.1 Navigate to Routing Policies and Verify Page Layout **[@viewer]**

**Steps:**

1. Login to SigNoz application
2. Click on "Alerts" in the main navigation
3. Click on "Configuration" tab
4. Click on "Routing Policies" sub-tab
5. Observe page layout and components

**Expected Results:**

- Successfully navigates to Routing Policies page
- Page displays "Routing Policies" heading
- Page shows "Create and manage routing policies" description
- Header contains "Routing Policies" title
- Search functionality is prominently displayed with placeholder "Search for a routing policy..."
- "New routing policy" button with plus icon is visible and clickable
- Policy list displays in expandable table format
- Each policy shows name and management icons (edit/delete)
- Existing policies are displayed in a table format (if any exist)
- Pagination controls are present at bottom
- Page maintains consistent SigNoz design system

### 2. Creating New Routing Policies **[@admin]**

**Seed:** `tests/seed.spec.ts`

#### 2.1 Create Routing Policies with Basic and Complex Expressions **[@admin]**

**Steps:**

1. Navigate to Routing Policies page
2. Click "New routing policy" button
3. Fill in routing policy name: "Critical Payment Alerts"
4. Fill in description: "Route critical payment service alerts to Slack"
5. Enter expression: `service.name == "payment" && severity == "critical"`
6. Select notification channel from dropdown
7. Click "Save Routing Policy"
8. Ensure that the success notification shows

**Expected Results:**

- "Create routing policy" dialog opens for each policy creation
- All form fields are properly labeled and accessible
- Policy name field accepts alphanumeric characters and special characters
- Description field accepts multi-line text
- Expression field provides syntax guidance
- Notification channels dropdown shows available channels
- Save button is enabled when required fields are filled
- Policy is created successfully and appears in the policies list
- Success message or confirmation is displayed for each creation
- Multiple notification channels can be selected
- Policies save successfully with complex conditions

#### 2.2 Create Policy with Empty Required Fields **[@admin]**

**Steps:**

1. Click "New routing policy" button
2. Leave name field empty
3. Enter valid expression and select notification channel
4. Attempt to save

**Expected Results:**

- Validation prevents saving
- Required field indicators are shown
- Error messages specify which fields are required
- Form submission is blocked until required fields are filled

#### 2.3 Cancel Policy Creation **[@admin]**

**Steps:**

1. Click "New routing policy" button
2. Fill in some form fields
3. Click "Cancel" button

**Expected Results:**

- Dialog closes without saving
- No new policy is created
- Returns to main routing policies list
- No error messages or side effects

### 3. Viewing and Managing Existing Policies

**Seed:** `tests/seed.spec.ts`

#### 3.1 View Policy Details **[@viewer]**

**Steps:**

1. Navigate to Routing Policies page with existing policies
2. Click on a routing policy row to expand it

**Expected Results:**

- Policy details expand below the policy name
- Shows "Created by" with user email
- Shows "Created on" with formatted timestamp
- Shows "Updated by" with user email
- Shows "Updated on" with formatted timestamp
- Displays "Expression" with the routing condition
- Shows "Description" text
- Lists associated "Channels" with channel names
- All information is properly formatted and readable

#### 3.2 Verify Policy Metadata Accuracy **[@admin]**

**Steps:**

1. Create a new policy and note creation time
2. View the policy details
3. Verify metadata matches creation details

**Expected Results:**

- Created by shows current user
- Created on shows accurate timestamp
- Updated fields match created fields for new policies
- All metadata is consistent and accurate

### 4. Search and Filter Functionality

**Seed:** `tests/seed.spec.ts`

#### 4.1 Search Policies by Name **[@viewer]**

**Steps:**

1. Navigate to Routing Policies page with multiple policies
2. Enter a policy name in the search box
3. Observe filtered results

**Expected Results:**

- Search filters policies in real-time or after pressing Enter
- Only matching policies are displayed
- Search is case-insensitive
- Partial matches are supported
- Clear search shows all policies again

#### 4.2 Search with No Results **[@viewer]**

**Steps:**

1. Enter a search term that matches no policies
2. Observe the results

**Expected Results:**

- "No results" or similar message is displayed
- Empty state is user-friendly
- Search can be cleared to return to full list
- No errors or broken UI elements

### 5. Pagination and Navigation

**Seed:** `tests/seed.spec.ts`

#### 5.1 Setup Pagination Test Data **[@admin]**

**Pre-requisite Steps:**

1. Create 6 routing policies to ensure pagination is triggered:
   - Policy 1: "Test Policy Alpha"
   - Policy 2: "Test Policy Beta"
   - Policy 3: "Test Policy Gamma"
   - Policy 4: "Test Policy Delta"
   - Policy 5: "Test Policy Epsilon"
   - Policy 6: "Test Policy Zeta"

#### 5.2 Navigate Between Pages **[@viewer]**

**Steps:**

1. Navigate to routing policies with more than one page of results
2. Click "Next Page" button
3. Click "Previous Page" button
4. Click specific page numbers

**Expected Results:**

- Pagination controls function correctly
- Page content updates appropriately
- Page numbers reflect current page
- Previous/Next buttons enable/disable appropriately

### 6. Notification Channel Integration

**Seed:** `tests/seed.spec.ts`

#### 6.1 Select Notification Channels **[@admin]**

**Steps:**

1. Create new routing policy
2. Open notification channels dropdown
3. Select single channel
4. Save policy
5. Verify channel association

**Expected Results:**

- Notification channels dropdown shows available channels
- Channels can be selected successfully
- Selected channels are displayed in policy details
- Channel names are accurately displayed
- Channel selection persists after saving

#### 6.2 Multiple Channel Selection **[@admin]**

**Steps:**

1. Create policy with multiple notification channels
2. Select 2-3 different channels
3. Save and verify

**Expected Results:**

- Multiple channels can be selected (if supported)
- All selected channels are saved with policy
- Policy details show all associated channels
- Channel list is properly formatted

#### 6.3 No Channel Selection **[@admin]**

**Steps:**

1. Create policy without selecting notification channels
2. Attempt to save

**Expected Results:**

- Validation handles missing channels appropriately
- Either requires at least one channel or allows empty
- Clear guidance on channel requirements
- Consistent behavior across the application

### 7. Policy Management Operations

**Seed:** `tests/seed.spec.ts`

#### 7.1 Edit Existing Policy **[@admin]**

**Steps:**

1. Locate existing routing policy
2. Click edit button/option
3. Modify policy name, description, and expression
4. Update notification channels
5. Save changes

**Expected Results:**

- Edit functionality is accessible
- All fields can be modified
- Changes are saved successfully
- Updated information appears in policy list
- Metadata shows correct "Updated by" and "Updated on"

#### 7.2 Delete Routing Policy **[@admin]**

**Steps:**

1. Locate existing routing policy
2. Click delete button/option
3. Confirm deletion when prompted

**Expected Results:**

- Delete option is available
- Confirmation dialog prevents accidental deletion
- Policy is removed from list after confirmation
- No errors or broken references remain
- Other policies remain unaffected

#### 7.3 Delete Policy Confirmation **[@admin]**

**Steps:**

1. Attempt to delete a policy
2. Cancel the deletion when prompted
3. Verify policy remains

**Expected Results:**

- Cancellation prevents deletion
- Policy remains in list unchanged
- No side effects from cancelled deletion
- User can retry deletion if needed

### 8. Error Handling and Edge Cases

**Seed:** `tests/seed.spec.ts`

#### 8.1 Network Error Handling **[@admin]**

**Steps:**

1. Simulate network disconnection
2. Attempt to create/save routing policy
3. Restore network connection

**Expected Results:**

- Appropriate error messages for network issues
- Form data is preserved during network errors
- User can retry operation after network restoration
- No data corruption or partial saves

#### 8.2 Large Expression Handling **[@admin]**

**Steps:**

1. Create policy with very long expression (500+ characters)
2. Test policy with complex nested conditions
3. Save and verify

**Expected Results:**

- Long expressions are handled correctly
- UI accommodates long text without breaking
- Performance remains acceptable
- Expression validation works with complex conditions

#### 8.3 Special Character Handling **[@admin]**

**Steps:**

1. Test policy names with special characters: !@#$%^&\*()
2. Test expressions with escaped quotes and special characters
3. Test descriptions with unicode characters

**Expected Results:**

- Special characters are properly handled
- String escaping works correctly
- Unicode text is supported
- No XSS or injection vulnerabilities

### 9. Performance and Scalability

**Seed:** `tests/seed.spec.ts`

#### 9.1 Concurrent User Actions **[@admin]**

**Steps:**

1. Have multiple users create/edit policies simultaneously
2. Verify data consistency
3. Test for race conditions

**Expected Results:**

- No data corruption from concurrent edits
- Proper conflict resolution mechanisms
- Users see updated data appropriately
- System maintains data integrity

### 10. Security and Access Control

**Seed:** `tests/seed.spec.ts`

#### 10.1 User Permission Validation **[@admin]**

**Steps:**

1. Test routing policies access with different user roles
2. Verify create/edit/delete permissions
3. Test unauthorized access attempts

**Expected Results:**

- Appropriate permissions are enforced
- Unauthorized users cannot modify policies
- Clear feedback on permission restrictions
- No sensitive data exposure

### 11. Integration and Data Consistency

**Seed:** `tests/seed.spec.ts`

#### 11.1 Alert Routing Verification **[@admin]**

**Steps:**

1. Create routing policy with specific conditions
2. Generate test alert matching policy conditions
3. Verify alert is routed to specified channels

**Expected Results:**

- Routing policies correctly filter alerts
- Alerts reach specified notification channels
- Policy conditions are accurately evaluated
- No alerts are lost or misrouted

#### 12.2 Notification Channel Synchronization **[@admin]**

**Steps:**

1. Create routing policy with notification channel
2. Delete or modify the notification channel
3. Verify routing policy behavior

**Expected Results:**

- Routing policies handle channel changes gracefully
- Orphaned channel references are managed appropriately
- User is notified of channel issues
- System remains stable with invalid channel references

## Quality Standards

- **Reproducibility**: All scenarios can be executed independently and repeatedly
- **Clarity**: Steps are specific enough for any tester to follow without ambiguity
- **Coverage**: Scenarios cover happy path, edge cases, error conditions, and security aspects
- **Traceability**: Each test links back to specific routing policies functionality
- **Automation-Ready**: Steps are written to facilitate future test automation

## Environment Setup

- **Prerequisites**: Valid SigNoz workspace with appropriate permissions
- **Test Data**: Multiple notification channels configured for testing
- **User Accounts**: Test users with different permission levels (admin, editor, viewer)
- **Network**: Stable internet connection for cloud testing

## Success Criteria

- All routing policy CRUD operations function correctly
- Notification channel integration works seamlessly
- Search and pagination handle large datasets efficiently
- Mobile and responsive designs maintain full functionality
- Security measures prevent unauthorized access and injection attacks
- Performance remains acceptable under normal and stress conditions
- User role permissions are properly enforced
