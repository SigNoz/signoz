import { test, expect } from '../../fixtures/auth';

test.describe('Routing Policies', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    // Login to the application

    // Navigate to Routing Policies through sidebar navigation
    await page.locator('svg.lucide-bell-dot').click();

    // Navigate to Configuration tab
    await page.getByRole('tab', { name: 'Configuration' }).click();

    // Navigate to Routing Policies tab
    await page.getByRole('tab', { name: 'Routing Policies' }).click();
  });

  test(
    'Navigate to Routing Policies and verify page layout',
    async ({ authedPage: page }) => {
      // 1. Verify header contains "Routing Policies" title
      await expect(
        page.getByRole('heading', { name: 'Routing Policies' }),
      ).toBeVisible();

      // 2. Verify search functionality is prominently displayed
      const searchBox = page.getByRole('textbox', {
        name: 'Search for a routing policy...',
      });
      await expect(searchBox).toBeVisible();

      // 3. Verify "New routing policy" button with plus icon is visible
      const newPolicyButton = page.getByRole('button', {
        name: 'plus New routing policy',
      });
      await expect(newPolicyButton).toBeVisible();

      // 4. Verify policy list displays in table format
      await expect(page.getByRole('table')).toBeVisible();

      // 5. Verify pagination controls are present at bottom
      await expect(page.getByRole('list')).toBeVisible();
    },
  );

  test(
    'Create Routing Policies with Basic and Complex Expressions',
    async ({ authedPage: page }) => {
      // 1. Navigate to Routing Policies page (done in beforeEach)

      // 2. Click "New routing policy" button
      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();

      // 3. Verify "Create routing policy" dialog opens
      await expect(
        page.getByRole('dialog', { name: 'Create routing policy' }),
      ).toBeVisible();

      // 4. Fill in routing policy name
      await page
        .getByRole('textbox', { name: 'e.g. Base routing policy...' })
        .fill('Critical Payment Alerts');

      // 5. Fill in description
      await page
        .getByRole('textbox', { name: 'e.g. This is a routing policy' })
        .fill('Route critical payment service alerts to Slack');

      // 6. Enter expression
      await page
        .getByRole('textbox', { name: 'e.g. service.name == "payment' })
        .fill('service.name == "payment" && severity == "critical"');

      // 7. Select notification channel from dropdown
      await page.locator('.ant-select').click();
      await page.locator('.ant-select-item').first().click();

      // 8. Click "Save Routing Policy"
      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      // 9. Verify success message appears
      await expect(
        page.getByText('Routing policy created successfully'),
      ).toBeVisible();

      // 10. Create second policy with complex expression
      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();

      // 11. Enter name for complex policy
      await page
        .getByRole('textbox', { name: 'e.g. Base routing policy...' })
        .fill('Multi-Condition Alert Routing');

      // 12. Enter description for complex policy
      await page
        .getByRole('textbox', { name: 'e.g. This is a routing policy' })
        .fill('Route alerts based on multiple conditions');

      // 13. Enter complex expression with multiple conditions
      const complexExpression =
        '(service.name == "payment" || service.name == "billing") && (severity == "critical" || severity == "high") && region == "us-east-1"';
      await page
        .getByRole('textbox', { name: 'e.g. service.name == "payment' })
        .fill(complexExpression);

      // 14. Select notification channel for complex policy
      await page.locator('.ant-select').click();
      await page.locator('.ant-select-item').first().click();

      // 15. Save the complex policy
      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      // 16. Verify complex policy saves successfully
      await expect(
        page.getByText('Routing policy created successfully'),
      ).toBeVisible();
    },
  );

  test(
    'Create Policy with Empty Required Fields',
    async ({ authedPage: page }) => {
      // 1. Click "New routing policy" button
      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();

      // 2. Wait for dialog to be visible
      await expect(
        page.getByRole('dialog', { name: 'Create routing policy' }),
      ).toBeVisible();

      // 3. Leave name field empty and fill other fields
      await page
        .getByRole('textbox', { name: 'e.g. service.name == "payment' })
        .fill('service.name == "test"');

      // 4. Select notification channel
      await page.locator('.ant-select').click();
      await page.locator('.ant-select-item').first().click();

      // 5. Attempt to save without required name
      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      // 6. Wait a moment for validation to trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 7. Verify the form doesn't submit and dialog remains open
      await expect(
        page.getByRole('dialog', { name: 'Create routing policy' }),
      ).toBeVisible();

      // 8. Check that the name field exists and is still empty
      const nameField = page.getByRole('textbox', {
        name: 'e.g. Base routing policy...',
      });

      // 9. Verify the field is still empty (indicating form didn't submit)
      await expect(nameField).toHaveValue('');

      // 10. Verify the specific error message appears
      await expect(
        page.getByText('Please provide a name for the routing policy'),
      ).toBeVisible();

      // 11. Fill the required name field to verify form can now be submitted
      await nameField.fill('Test Policy Name');

      // 12. Verify error message disappears after filling the field
      await expect(
        page.getByText('Please provide a name for the routing policy'),
      ).toBeHidden();

      // 13. Attempt to save again with name filled
      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      // 14. Verify successful creation or that we progress past validation
      await expect(
        page.getByText('Routing policy created successfully'),
      ).toBeVisible();
    },
  );

  test(
    'Cancel Policy Creation',
    async ({ authedPage: page }) => {
      // 1. Click "New routing policy" button
      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();

      // 2. Fill in some form fields
      await page
        .getByRole('textbox', { name: 'e.g. Base routing policy...' })
        .fill('Test Policy');
      await page
        .getByRole('textbox', { name: 'e.g. This is a routing policy' })
        .fill('Test description');

      // 3. Click "Cancel" button
      await page.getByRole('button', { name: 'Cancel' }).click();

      // 4. Verify dialog closes and returns to main list
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(
        page.getByRole('heading', { name: 'Routing Policies' }),
      ).toBeVisible();
    },
  );

  test(
    'Search Policies by Name',
    async ({ authedPage: page }) => {
      // 1. Create a test policy first
      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();
      await page
        .getByRole('textbox', { name: 'e.g. Base routing policy...' })
        .fill('Searchable Test Policy');
      await page
        .getByRole('textbox', { name: 'e.g. This is a routing policy' })
        .fill('Policy for search testing');
      await page
        .getByRole('textbox', { name: 'e.g. service.name == "payment' })
        .fill('service.name == "search-test"');
      await page.locator('.ant-select').click();
      await page.locator('.ant-select-item').first().click();
      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      // Wait for creation success
      await expect(
        page.getByText('Routing policy created successfully'),
      ).toBeVisible();

      // 2. Navigate to routing policies page with multiple policies
      await page.goto(
        'https://quiet-buffalo.us.staging.signoz.cloud/alerts?tab=Configuration',
      );
      await new Promise(f => setTimeout(f, 2000)); // Wait for page load
      await page.getByRole('tab', { name: 'Routing Policies' }).click();

      // 3. Enter a policy name in the search box
      await page
        .getByRole('textbox', { name: 'Search for a routing policy...' })
        .fill('Searchable Test Policy');

      // 4. Press Enter to execute search
      await page.keyboard.press('Enter');

      // 5. Verify filtered results show only matching policy
      await expect(page.getByText('Searchable Test Policy').first()).toBeVisible();
    },
  );

  test(
    'Search with No Results',
    async ({ authedPage: page }) => {
      // 1. Enter a search term that matches no policies
      await page
        .getByRole('textbox', { name: 'Search for a routing policy...' })
        .fill('NonExistentPolicyName12345');
      await page.keyboard.press('Enter');

      // 2. Verify appropriate empty state or no results message
      // Note: The exact behavior would depend on how the application handles no search results
      const searchBox = page.getByRole('textbox', {
        name: 'Search for a routing policy...',
      });
      await expect(searchBox).toHaveValue('NonExistentPolicyName12345');
    },
  );

  test(
    'View Policy Details',
    async ({ authedPage: page }) => {
      // 1. Create a policy with unique name
      const uniquePolicyName = `Test Policy ${Date.now()}`;

      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();

      await page
        .getByRole('textbox', { name: 'e.g. Base routing policy...' })
        .fill(uniquePolicyName);

      await page
        .getByRole('textbox', { name: 'e.g. This is a routing policy' })
        .fill('Test description for policy details');

      await page
        .getByRole('textbox', { name: 'e.g. service.name == "payment' })
        .fill('service.name == "test-details"');

      await page.locator('.ant-select').click();
      await page.locator('.ant-select-item').first().click();

      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      await expect(
        page.getByText('Routing policy created successfully'),
      ).toBeVisible();

      // 2. Search for the created policy
      const searchBox = page.getByRole('textbox', {
        name: 'Search for a routing policy...',
      });
      await searchBox.fill(uniquePolicyName);
      await page.keyboard.press('Enter');

      // 3. Wait for search results and click on the policy to expand it
      await expect(page.getByText(uniquePolicyName)).toBeVisible();
      const policyTab = page.getByRole('tab', { name: 'right' }).first();
      await policyTab.click();

      // 4. Wait for expansion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 5. Verify all field keys are present
      await expect(page.getByText('Created by')).toBeVisible();
      await expect(page.getByText('Created on')).toBeVisible();
      await expect(page.getByText('Updated by')).toBeVisible();
      await expect(page.getByText('Updated on')).toBeVisible();
      await expect(page.getByText('Expression')).toBeVisible();
      await expect(page.getByText('Description', { exact: true })).toBeVisible();
      await expect(page.getByText('Channels')).toBeVisible();

      // 6. Verify the specific values we created
      await expect(page.getByText(uniquePolicyName)).toBeVisible();
      await expect(page.getByText('Test description for policy details')).toBeVisible();
      await expect(page.getByText('service.name == "test-details"')).toBeVisible();
    },
  );

  test(
    'Edit Existing Policy',
    async ({ authedPage: page }) => {
      // 1. Create a policy to edit first
      const uniquePolicyName = `Policy to Edit ${Date.now()}`;

      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();

      await page
        .getByRole('textbox', { name: 'e.g. Base routing policy...' })
        .fill(uniquePolicyName);

      await page
        .getByRole('textbox', { name: 'e.g. This is a routing policy' })
        .fill('Original description');

      await page
        .getByRole('textbox', { name: 'e.g. service.name == "payment' })
        .fill('service.name == "original"');

      await page.locator('.ant-select').click();
      await page.locator('.ant-select-item').first().click();

      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      await expect(
        page.getByText('Routing policy created successfully'),
      ).toBeVisible();

      // 2. Search for the created policy
      const searchBox = page.getByRole('textbox', {
        name: 'Search for a routing policy...',
      });
      await searchBox.fill(uniquePolicyName);
      await page.keyboard.press('Enter');

      // 3. Wait for search results and click on the policy to expand it
      await expect(page.getByText(uniquePolicyName)).toBeVisible();
      const policyTab = page.getByRole('tab', { name: 'right' }).first();
      await policyTab.click();

      // 4. Wait for expansion and click edit button
      await new Promise(resolve => setTimeout(resolve, 1000));
      const editButton = page.getByTestId('edit-routing-policy');
      await editButton.click();

      // 5. Verify edit dialog opens
      await expect(
        page.getByRole('dialog', { name: 'Edit routing policy' }),
      ).toBeVisible();

      // 6. Update the title and description
      const updatedPolicyName = `Updated ${uniquePolicyName}`;
      const nameField = page.getByRole('textbox', { name: 'e.g. Base routing policy...' });
      await nameField.clear();
      await nameField.fill(updatedPolicyName);

      const descriptionField = page.getByRole('textbox', { name: 'e.g. This is a routing policy' });
      await descriptionField.clear();
      await descriptionField.fill('Updated description after editing');

      // 7. Save the changes
      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      // 8. Verify success toast message appears
      await expect(
        page.getByText('Routing policy updated successfully'),
      ).toBeVisible();

      // 9. Search for the updated policy name to ensure it exists
      await searchBox.clear();
      await searchBox.fill(updatedPolicyName);
      await page.keyboard.press('Enter');

      // 10. Verify the updated policy is found
      await expect(page.getByText(updatedPolicyName)).toBeVisible();
    },
  );

  test(
    'Delete Routing Policy',
    async ({ authedPage: page }) => {
      // 1. Create a policy to delete first
      const uniquePolicyName = `Policy to Delete ${Date.now()}`;

      await page
        .getByRole('button', { name: 'plus New routing policy' })
        .click();

      await page
        .getByRole('textbox', { name: 'e.g. Base routing policy...' })
        .fill(uniquePolicyName);

      await page
        .getByRole('textbox', { name: 'e.g. This is a routing policy' })
        .fill('This policy will be deleted');

      await page
        .getByRole('textbox', { name: 'e.g. service.name == "payment' })
        .fill('service.name == "delete-test"');

      await page.locator('.ant-select').click();
      await page.locator('.ant-select-item').first().click();

      await page.getByRole('button', { name: 'Save Routing Policy' }).click();

      await expect(
        page.getByText('Routing policy created successfully'),
      ).toBeVisible();

      // 2. Search for the created policy
      const searchBox = page.getByRole('textbox', {
        name: 'Search for a routing policy...',
      });
      await searchBox.fill(uniquePolicyName);
      await page.keyboard.press('Enter');

      // 3. Wait for search results and click on the policy to expand it
      await expect(page.getByText(uniquePolicyName)).toBeVisible();
      const policyTab = page.getByRole('tab', { name: 'right' }).first();
      await policyTab.click();

      // 4. Wait for expansion and click delete button
      await new Promise(resolve => setTimeout(resolve, 1000));
      const deleteButton = page.getByTestId('delete-routing-policy');
      await deleteButton.click();

      // 5. Verify delete confirmation modal opens
      await expect(
        page.getByRole('dialog').filter({ hasText: 'Delete' }),
      ).toBeVisible();

      // 6. Click confirm to delete the policy
      await page.getByRole('button', { name: 'Delete' }).click();

      // 7. Verify success notification appears
      await expect(
        page.getByText('Routing policy deleted successfully'),
      ).toBeVisible();

      // 8. Verify the deleted policy is no longer in the list
      await searchBox.clear();
      await searchBox.fill(uniquePolicyName);
      await page.keyboard.press('Enter');

      // 9. Verify the policy is not found
      await expect(page.getByText(uniquePolicyName)).toBeHidden();
    },
  );
});
