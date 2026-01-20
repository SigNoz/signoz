# Members & SSO E2E Scenarios (Updated)

## 1. Invite a New Member

- **Precondition:** User is admin
- **Steps:**
  1. Click 'Invite Members' button
  2. In the 'Invite team members' dialog, enter email address, name (optional), and select role
  3. (Optional) Click 'Add another team member' to invite more
  4. Click 'Invite team members' to send invite(s)
- **Expected:** Pending invite appears in the 'Pending Invites' table

## 2. Remove a Member

- **Precondition:** User is admin, member exists
- **Steps:**
  1. In the 'Members' table, locate the member row
  2. Click 'Delete' in the Action column
  3. Confirm removal if prompted
- **Expected:** Member is removed from the table

## 3. Update Member Roles

- **Precondition:** User is admin, member exists
- **Steps:**
  1. In the 'Members' table, locate the member row
  2. Click 'Edit' in the Action column
  3. Change role in the edit dialog/modal
  4. Save changes
- **Expected:** Member role is updated in the table

## 4. Configure SSO

- **Precondition:** User is admin
- **Steps:**
  1. In the 'Authenticated Domains' section, locate the domain row
  2. Click 'Configure SSO' or 'Edit Google Auth' as available
  3. Complete SSO provider configuration in the modal/dialog
  4. Save settings
- **Expected:** SSO is configured for the domain

## 5. Login via SSO

- **Precondition:** SSO is configured
- **Steps:**
  1. Log out from the app
  2. On the login page, click 'Login with SSO'
  3. Complete SSO login flow
- **Expected:** User is logged in via SSO
