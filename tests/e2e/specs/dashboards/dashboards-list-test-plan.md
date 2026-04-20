# Dashboards List Page - Comprehensive Test Plan

<!-- spec: tests/dashboards/dashboards-list.spec.ts -->
<!-- seed: tests/seed.spec.ts -->

## Application Overview

The Dashboards list page (`/dashboard`) is the central hub for managing observability dashboards in SigNoz. It provides:

- **Dashboard Listing**: A table displaying all dashboards with a thumbnail image, name, tags, last-updated timestamp, and creator avatar initial + email
- **Inline Quick Create**: A "Enter dashboard name..." text field followed by a disabled "Submit" button that enables once text is entered, allowing rapid dashboard creation without a modal
- **New Dashboard Dropdown**: A "New dashboard" button that expands a dropdown menu to offer three options: "Create dashboard", "Import JSON", and "View templates" (external link)
- **Search**: A "Search by name, description, or tags..." input that filters the list in real time and reflects the query in the URL
- **Sorting**: A sort control (icon button) adjacent to the "All Dashboards" label that controls display order; currently the sort only applies `descend` order and does not update the URL
- **Per-row Action Menu**: A three-dot action icon (`dashboard-action-icon`) on each row, revealed via interaction, that opens a popover with: View, Open in New Tab, Copy Link, Export JSON, and Delete dashboard
- **Delete Confirmation Dialog**: A modal that requires confirmation before deleting, showing the dashboard name in the prompt with "Cancel" and "Delete" buttons
- **Import JSON Dialog**: A modal with a Monaco code editor, "Upload JSON file" button, "View templates" link, and "Import and Next" button
- **Pagination**: 20 dashboards per page with a pagination bar showing item range and page navigation
- **URL State Synchronization**: Search term is reflected in the URL query string

**Route**: `/dashboard`

**Page Title**: `SigNoz | All Dashboards`

**URL State Parameters**:
- `search` — active search query (reflected in URL when a search is typed)

**Row Data Fields** (two visual sections per row):
- Section 1: Dashboard thumbnail image (alt: `dashboard-image`), dashboard name, tags (displayed as pills; overflow shown as `+ N`), and three-dot action icon
- Section 2: Clock icon, last-updated timestamp (format: `MMM DD, YYYY ⎯ HH:mm:ss (UTC ±HH:MM)`), creator avatar initial, and creator email

**Pagination**: 20 items per page; pagination bar shows `N — 20 of total` and page number buttons

## User Role Permissions

- **@viewer**: Can view the dashboard list, search, sort, and navigate into dashboards; cannot create or delete; "Enter dashboard name..." input, "Submit" button, and "New dashboard" button are hidden; three-dot action icon is hidden
- **@editor**: Can create dashboards (inline, via dropdown, via JSON import); three-dot action menu is visible but "Delete dashboard" is not available; cannot delete
- **@admin**: Full access — all viewer and editor capabilities plus delete

---

## Test Scenarios

### 1. Page Load and Layout

**Seed:** `tests/seed.spec.ts`

#### 1.1 Dashboard list page loads correctly `@viewer`

**Pre-conditions:**
- User is logged in (session restored from storageState)

**Steps:**
1. Navigate to `/dashboard`
2. Wait for the page to fully load

**Expected Results:**
- URL is `/dashboard` (no query parameters on fresh load)
- Page title is `SigNoz | All Dashboards`
- H1 heading "Dashboards" is visible
- Subtitle "Create and manage dashboards for your workspace." is visible
- "Search by name, description, or tags..." text input is visible
- "All Dashboards" section label is visible
- Sort control icon button is visible next to "All Dashboards" label
- Dashboard table rows are visible with at least one entry
- Pagination bar is visible showing item range and page numbers
- "Feedback" and "Share" buttons are visible in the top-right header area

#### 1.2 Dashboard list shows correct data fields per row `@viewer`

**Pre-conditions:**
- At least one dashboard exists in the workspace

**Steps:**
1. Navigate to `/dashboard`
2. Wait for the table to load
3. Inspect the first dashboard row

**Expected Results:**
- Each row shows a dashboard thumbnail image (with alt text `dashboard-image`)
- Each row shows the dashboard name as text
- Dashboards with tags show tag pills; extra tags beyond display limit appear as `+ N`
- Each row shows a last-updated timestamp in `MMM DD, YYYY ⎯ HH:mm:ss (UTC ±HH:MM)` format
- Each row shows the creator's avatar initial (single letter) and email address
- The default row order shows the most recently updated dashboard first (descending by updated date)

#### 1.3 Pagination bar shows correct item count `@viewer`

**Pre-conditions:**
- More than 20 dashboards exist

**Steps:**
1. Navigate to `/dashboard`
2. Observe the pagination bar at the bottom of the list

**Expected Results:**
- Pagination bar shows text like `1 — 20 of 21` (or actual total count)
- Page number buttons are visible (e.g., `1`, `2`)
- "Previous Page" button is disabled on page 1
- "Next Page" button is enabled when more pages exist

---

### 2. Search Functionality

**Seed:** `tests/seed.spec.ts`

#### 2.1 Search filters dashboards by name `@viewer`

**Pre-conditions:**
- Multiple dashboards exist with distinct names

**Steps:**
1. Navigate to `/dashboard`
2. Wait for the dashboard list to load
3. Click the "Search by name, description, or tags..." input
4. Type `APM`
5. Observe the filtered list

**Expected Results:**
- Only dashboards whose name, description, or tags contain "APM" are displayed
- Dashboards not matching the query are hidden
- The URL updates to include `?search=APM`
- The search input retains the typed value

#### 2.2 Search state is reflected in the URL `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Type a search term (e.g., `PromQL`) in the search input
3. Observe the URL

**Expected Results:**
- URL contains `search=PromQL`
- Navigating to that URL in a new tab pre-fills the search input and shows filtered results immediately

#### 2.3 Clearing search restores the full list `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Type `APM` in the search input
3. Verify filtered results are shown
4. Clear the search input (select all and delete, or use clear button)
5. Observe the list

**Expected Results:**
- All dashboards are visible again after clearing
- The `search` parameter is removed from the URL (or set to empty)

#### 2.4 Search with no matching results shows empty state `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Type a string that matches no dashboard name, description, or tag (e.g., `xyznonexistent999`)

**Expected Results:**
- No dashboard rows are displayed
- An empty state or "no results" indicator is shown (no error, no broken layout)
- The search input remains functional

#### 2.5 Search is case-insensitive `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Note the name of a dashboard that uses mixed case (e.g., "APM Metrics")
3. Search for the lowercase version (e.g., `apm metrics`)

**Expected Results:**
- The dashboard is included in results regardless of search case

---

### 3. Sorting

**Seed:** `tests/seed.spec.ts`

#### 3.1 Default sort shows most recently updated dashboard first `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Observe the order of rows

**Expected Results:**
- The dashboard with the most recent "last updated" timestamp appears first in the list
- The URL has no sort-related query parameters by default (no `columnKey` or `order` params)

#### 3.2 Sort control button is clickable and applies descending sort `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Note the current first row
3. Click the sort control icon button next to the "All Dashboards" label

**Expected Results:**
- The button is clickable without error
- The list remains in descending order (current behavior: sort toggle only applies `descend`; toggling does not switch to ascending)
- The URL does not change when the sort button is clicked

---

### 4. Row Actions (Context Menu)

**Seed:** `tests/seed.spec.ts`

#### 4.1 Row action menu shows correct options for Admin `@admin`

**Pre-conditions:**
- At least one dashboard exists

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row (data-testid: `dashboard-action-icon`)

**Expected Results:**
- A popover appears containing exactly these options (in order):
  1. View
  2. Open in New Tab
  3. Copy Link
  4. Export JSON
  5. Delete dashboard (in a separate section, styled as a destructive action)

#### 4.2 Row action menu shows correct options for Editor `@editor`

**Pre-conditions:**
- At least one dashboard exists
- User has editor role

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row

**Expected Results:**
- A popover appears containing: View, Open in New Tab, Copy Link, Export JSON
- "Delete dashboard" is NOT visible in the menu for editor role

#### 4.3 "View" action navigates to the dashboard detail page `@viewer`

**Pre-conditions:**
- User has at least `action` permission (editor or admin)

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row
3. Click "View"

**Expected Results:**
- Browser navigates to `/dashboard/<uuid>`
- The dashboard detail page loads with the correct title

#### 4.4 "Open in New Tab" action opens dashboard in a new browser tab `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row
3. Click "Open in New Tab"

**Expected Results:**
- A new browser tab opens at `/dashboard/<uuid>`

#### 4.5 "Copy Link" action copies the dashboard URL to clipboard `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row
3. Click "Copy Link"

**Expected Results:**
- A success notification or visual feedback confirms the link was copied
- The clipboard contains a URL pointing to the dashboard detail page

#### 4.6 "Export JSON" action downloads the dashboard as a JSON file `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row
3. Click "Export JSON"

**Expected Results:**
- A file download is triggered
- The downloaded file is valid JSON representing the dashboard configuration

#### 4.7 Context menu closes when clicking outside `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon to open the context menu
3. Click somewhere outside the popover (e.g., on the heading)

**Expected Results:**
- The context menu closes
- The page remains on `/dashboard` with no navigation

---

### 5. Creating Dashboards

**Seed:** `tests/seed.spec.ts`

#### 5.1 Create section is visible to Editor and Admin but hidden from Viewer `@viewer`

**Steps:**
1. Navigate to `/dashboard` as a viewer user

**Expected Results:**
- The "Enter dashboard name..." input is NOT visible
- The "Submit" button is NOT visible
- The "New dashboard" button is NOT visible
- The "Browse dashboard templates" link may or may not be visible

#### 5.2 "Create dashboard" via New dashboard dropdown creates and navigates to new dashboard `@editor`

**Pre-conditions:**
- User has editor or admin role

**Steps:**
1. Navigate to `/dashboard`
2. Note the current dashboard count
3. Click the "New dashboard" button
4. Click "Create dashboard" from the dropdown menu
5. Wait for navigation

**Expected Results:**
- Browser navigates to `/dashboard/<new-uuid>`
- The new dashboard detail page loads
- The default dashboard name is "Sample Title"
- Upon returning to `/dashboard`, the new dashboard appears in the list

#### 5.3 Inline "Enter dashboard name" field creates a named dashboard `@editor`

**Pre-conditions:**
- User has editor or admin role

**Steps:**
1. Navigate to `/dashboard`
2. Observe the "Submit" button is disabled
3. Click the "Enter dashboard name..." text input
4. Type a unique name (e.g., `Test Dashboard ${Date.now()}`)
5. Observe the "Submit" button becomes enabled
6. Click the "Submit" button
7. Wait for navigation

**Expected Results:**
- While the input is empty, the "Submit" button has the `disabled` attribute
- After typing a name, the "Submit" button becomes enabled
- After clicking Submit, navigation occurs to `/dashboard/<new-uuid>`
- The new dashboard has the typed name set as its title

#### 5.4 Submit button is disabled when dashboard name input is empty `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Observe the "Submit" button next to the "Enter dashboard name..." input without typing anything

**Expected Results:**
- The "Submit" button has the `disabled` attribute when the input is empty
- Clicking the disabled button does not trigger any action or navigation

#### 5.5 "New dashboard" dropdown shows three options `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Click the "New dashboard" button

**Expected Results:**
- A dropdown menu appears with exactly three menu items:
  1. "Create dashboard"
  2. "Import JSON"
  3. "View templates" (rendered as a link, opens external docs)

#### 5.6 Import JSON opens a dialog with code editor and file upload `@editor`

**Pre-conditions:**
- User has editor or admin role

**Steps:**
1. Navigate to `/dashboard`
2. Click the "New dashboard" button
3. Click "Import JSON"

**Expected Results:**
- A modal dialog appears with title "Import Dashboard JSON"
- A Monaco/code editor is visible with line numbers (showing at least line "1")
- An "Upload JSON file" button is visible
- A "View templates" link is visible (pointing to SigNoz documentation)
- An "Import and Next" button is visible
- A close ("×") button is visible in the top-right of the dialog

#### 5.7 Import JSON dialog closes on Escape `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Open the "Import JSON" dialog via "New dashboard" > "Import JSON"
3. Press Escape

**Expected Results:**
- The dialog closes
- The user remains on `/dashboard`

#### 5.8 Import JSON dialog closes on clicking the × button `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Open the "Import JSON" dialog via "New dashboard" > "Import JSON"
3. Click the × (Close) button in the top-right of the dialog

**Expected Results:**
- The dialog closes
- The user remains on `/dashboard`
- No new dashboard is created

#### 5.9 "View templates" in New dashboard dropdown opens external link `@viewer`

**Pre-conditions:**
- User has at least editor role (so the "New dashboard" button is visible)

**Steps:**
1. Navigate to `/dashboard`
2. Click the "New dashboard" button
3. Observe the "View templates" option

**Expected Results:**
- "View templates" renders as a link element
- The link URL points to `https://signoz.io/docs/dashboards/dashboard-templates/overview/`
- Clicking it opens the external documentation URL

#### 5.10 "Browse dashboard templates" link is visible and navigates to docs `@editor`

**Steps:**
1. Navigate to `/dashboard`
2. Observe the "Browse dashboard templates" link near the top of the page
3. Note the associated "or request a new template →" text next to it

**Expected Results:**
- The link "Browse dashboard templates" is visible
- Adjacent text "or request a new template →" is visible
- The link URL points to `https://signoz.io/docs/dashboards/dashboard-templates/overview/`

---

### 6. Deleting Dashboards

**Seed:** `tests/seed.spec.ts`

#### 6.1 Delete action shows a confirmation dialog with the dashboard name `@admin`

**Pre-conditions:**
- At least one dashboard exists
- User has admin role

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row (e.g., "APM Metrics")
3. Click "Delete dashboard"

**Expected Results:**
- A confirmation dialog appears with an exclamation-circle icon
- The dialog heading reads: "Are you sure you want to delete the [Dashboard Name] dashboard?" where the dashboard name is styled distinctly (e.g., bold)
- A "Cancel" button and a "Delete" button are present in the dialog
- The "Delete" button is in an active/danger style

#### 6.2 Cancelling the delete dialog navigates to the dashboard detail page `@admin`

**Pre-conditions:**
- Note: The current behavior is that clicking "Cancel" in the delete dialog navigates to the dashboard detail page (not back to the list page)

**Steps:**
1. Navigate to `/dashboard`
2. Click the three-dot action icon on any dashboard row
3. Click "Delete dashboard" to open the confirmation dialog
4. Click the "Cancel" button

**Expected Results:**
- The dialog closes
- The browser navigates to `/dashboard/<uuid>` (the detail page of the dashboard whose delete was cancelled)
- The dashboard remains in the system

#### 6.3 Confirming delete removes the dashboard from the list `@admin`

**Pre-conditions:**
- A disposable dashboard exists (create one first with a unique timestamped name)

**Steps:**
1. Navigate to `/dashboard`
2. Create a new dashboard via "New dashboard" > "Create dashboard"; note its name
3. Return to `/dashboard`
4. Locate the newly created dashboard row
5. Click its three-dot action icon
6. Click "Delete dashboard"
7. Click "Delete" in the confirmation dialog
8. Wait for the list to refresh

**Expected Results:**
- The dialog closes after clicking "Delete"
- The deleted dashboard no longer appears in the list
- All other dashboards remain unaffected

---

### 7. Dashboard Navigation (Row Click)

**Seed:** `tests/seed.spec.ts`

#### 7.1 Clicking a dashboard row navigates to the dashboard detail page `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Note the name of the first dashboard row
3. Click anywhere on the row (not on the three-dot action icon)

**Expected Results:**
- Browser navigates to `/dashboard/<uuid>`
- The dashboard detail page loads with the correct title matching the clicked row

---

### 8. URL State and Deep Linking

**Seed:** `tests/seed.spec.ts`

#### 8.1 URL search parameter is applied on page load `@viewer`

**Steps:**
1. Navigate directly to `/dashboard?search=PromQL`

**Expected Results:**
- The search input is pre-populated with "PromQL"
- The dashboard list shows only dashboards matching "PromQL"

#### 8.2 Browser back/forward navigation preserves search state `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Type "APM" in the search field
3. Click on any matching dashboard row to open it
4. Click the browser back button
5. Observe the dashboard list URL and state

**Expected Results:**
- The URL returns to `/dashboard?search=APM`
- The search input still contains "APM"
- The filtered list shows only APM-matching dashboards

---

### 9. Page Header Actions

**Seed:** `tests/seed.spec.ts`

#### 9.1 "Feedback" button is visible and clickable `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Locate the "Feedback" button in the top-right area of the page header

**Expected Results:**
- The "Feedback" button is visible and clickable
- Clicking it opens a feedback mechanism (e.g., modal or external link)

#### 9.2 "Share" button is visible and clickable `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Locate the "Share" button in the top-right area of the page header
3. Click "Share"

**Expected Results:**
- The "Share" button is visible
- Clicking it triggers a share action (e.g., copies page URL or opens a share dialog)

---

### 10. Edge Cases and Error Handling

**Seed:** `tests/seed.spec.ts`

#### 10.1 Tags overflow display shows `+ N` indicator `@viewer`

**Pre-conditions:**
- At least one dashboard has more tags than can be displayed inline

**Steps:**
1. Navigate to `/dashboard`
2. Find a dashboard row that has multiple tags with an overflow indicator

**Expected Results:**
- Visible tags are shown as individual pills
- The overflow indicator is shown as `+ N` (e.g., `+ 1`) where N is the number of hidden tags

#### 10.2 Dashboard with no tags shows a clean row `@viewer`

**Steps:**
1. Navigate to `/dashboard`
2. Find a dashboard row with no tags (e.g., "Sample Title")
3. Inspect the row content

**Expected Results:**
- The row shows the thumbnail, name, last-updated timestamp, and creator
- No tag pills or empty tag containers are visible
- Row layout is consistent with tagged dashboards

#### 10.3 Searching while on a non-first page resets to page 1 `@viewer`

**Pre-conditions:**
- Enough dashboards exist to have multiple pages (more than 20)

**Steps:**
1. Navigate to `/dashboard` and go to page 2
2. Type a search term in the search input

**Expected Results:**
- The page resets to show page 1 results
- The URL reflects the search term

#### 10.4 Dashboard list is accessible via the SigNoz sidebar navigation `@viewer`

**Steps:**
1. Log in and land on the home page
2. Look for the Dashboards navigation item in the left sidebar
3. Click it

**Expected Results:**
- Browser navigates to `/dashboard`
- The dashboard list page loads correctly

#### 10.5 Viewer cannot see create or action controls `@viewer`

**Steps:**
1. Log in as a Viewer user
2. Navigate to `/dashboard`

**Expected Results:**
- The "Enter dashboard name..." input is NOT visible
- The "Submit" button is NOT visible
- The "New dashboard" button is NOT visible
- The three-dot action icon on each row is NOT visible (rows do not show `dashboard-action-icon`)
- The dashboard list, search, sort, and navigation into dashboards all work normally

---

## Notes

- Default dashboard name on creation via "New dashboard" > "Create dashboard" is "Sample Title"; inline create sets the user-entered name
- The sort control currently only sorts descending; clicking it does not toggle to ascending, and the URL does not reflect sort state
- The `dashboard-action-icon` data-testid is the locator for the three-dot row action menu trigger
- Clicking "Cancel" in the delete confirmation dialog navigates to the dashboard detail page rather than returning to the list — tests should use the "Delete" button for actual delete flows
- The delete confirmation dialog uses `heading[level=5]` with the text "Are you sure you want to delete the [Name] dashboard?"
- The "View templates" entry in the New dashboard dropdown is rendered as a menu item containing a `link` element pointing to `https://signoz.io/docs/dashboards/dashboard-templates/overview/`
- The three-dot action menu is rendered as a tooltip/popover element (not an Ant Design dropdown menu)
- Editor role has the action menu visible but does not have the "Delete dashboard" option
- Viewer role has neither the create controls nor the action menu
