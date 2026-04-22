import { test, expect } from '../fixtures/auth';

test.describe.configure({ mode: 'serial' });

async function authHeaders(page: import('@playwright/test').Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('AUTH_TOKEN'));
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function deleteDowntimeIfExists(
  page: import('@playwright/test').Page,
  id: string | undefined,
): Promise<void> {
  if (!id) return;
  await page.request
    .delete(`/api/v1/downtime_schedules/${id}`, { headers: await authHeaders(page) })
    .catch(() => undefined);
}

test('TC-05 planned downtime — CRUD round-trip', async ({ authedPage: page }) => {
  const createName = 'downtime-once';
  const editedName = 'downtime-once-edited';
  let id: string | undefined;

  try {
    // List renders (header/table visible — tenant may or may not have rows).
    await page.goto('/alerts?tab=Configuration&subTab=planned-downtime');
    await expect(page.locator('.ant-collapse, table, .ant-spin').first()).toBeVisible();

    // Empty-form validation: name only → click Add → required field errors.
    await page.getByRole('button', { name: /new downtime/i }).click();
    const nameField = page.getByRole('textbox', { name: /name/i }).first();
    await nameField.fill(createName);
    await page.getByRole('button', { name: /add downtime schedule/i }).click();
    // Required-field validation fires on all unfilled date/select fields.
    await expect(
      page.getByText(/please enter (starts from|ends on|timezone)/i).first(),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    // Create via direct API. The Ant DatePicker calendar-cell path is
    // historically brittle across timezone and cells-in-view indices
    // (legacy run-4 documented this); this test's focus is the CRUD
    // round-trip + list UI, not the picker UX, so we POST directly.
    const now = Date.now();
    const createResp = await page.request.post('/api/v1/downtime_schedules', {
      data: {
        name: createName,
        description: 'downtime.spec.ts',
        schedule: {
          timezone: 'UTC',
          startTime: new Date(now).toISOString(),
          endTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          recurrence: null,
        },
        alertIds: [],
      },
      headers: await authHeaders(page),
    });
    expect(createResp.status()).toBeLessThan(300);
    const createJson = await createResp.json();
    id = (createJson.data?.id ?? createJson.id) as string;

    await page.goto('/alerts?tab=Configuration&subTab=planned-downtime');
    await expect(page.getByText(createName, { exact: false })).toBeVisible();

    // Edit via direct API (pencil icon is a lucide SVG with no testid
    // and its click-area is historically racey under test-runner speed).
    const editResp = await page.request.put(`/api/v1/downtime_schedules/${id}`, {
      data: {
        name: editedName,
        description: 'downtime.spec.ts-edited',
        schedule: {
          timezone: 'UTC',
          startTime: new Date(now).toISOString(),
          endTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          recurrence: null,
        },
        alertIds: [],
      },
      headers: await authHeaders(page),
    });
    expect(editResp.status()).toBeLessThan(300);
    await page.reload();
    await expect(page.getByText(editedName, { exact: false })).toBeVisible();

    // Delete via direct API; verify the UI reflects it.
    const delResp = await page.request.delete(`/api/v1/downtime_schedules/${id}`, {
      headers: await authHeaders(page),
    });
    expect(delResp.status()).toBeLessThan(300);
    id = undefined;
    await page.reload();
    await expect(page.getByText(editedName, { exact: false })).toHaveCount(0);
  } finally {
    await deleteDowntimeIfExists(page, id);
  }
});
