import { test, expect } from '../../fixtures/auth';

// Junction behavior: a rule linked to a downtime can't be deleted, and
// a downtime that references a rule can't be deleted either. Both surface
// as HTTP 409 `already_exists`.
test.describe.configure({ mode: 'serial' });

async function authHeaders(page: import('@playwright/test').Page): Promise<Record<string, string>> {
  try {
    const token = await page.evaluate(() => localStorage.getItem('AUTH_TOKEN'));
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

// Purge leftovers from prior runs. Downtimes are deleted first because
// they hold alertIds — deleting the rule first would 409 via the very
// cascade constraint this test probes.
async function purgeDowntimesByName(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  const resp = await page.request.get('/api/v1/downtime_schedules', { headers: await authHeaders(page) });
  if (!resp.ok()) return;
  const body = await resp.json();
  const items: Array<{ id: string; name?: string }> = body?.data ?? [];
  for (const orphan of items.filter((d) => d.name === name)) {
    // Unlink first to break any cascade constraint, then delete.
    await page.request
      .put(`/api/v1/downtime_schedules/${orphan.id}`, {
        data: {
          name: orphan.name,
          description: 'purge',
          schedule: {
            timezone: 'UTC',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 60_000).toISOString(),
            recurrence: null,
          },
          alertIds: [],
        },
        headers: await authHeaders(page),
      })
      .catch(() => undefined);
    await page.request
      .delete(`/api/v1/downtime_schedules/${orphan.id}`, { headers: await authHeaders(page) })
      .catch(() => undefined);
  }
}

async function purgeRulesByName(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  const resp = await page.request.get('/api/v1/rules', { headers: await authHeaders(page) });
  if (!resp.ok()) return;
  const body = await resp.json();
  const items: Array<{ id: string; alert?: string }> = body?.data?.rules ?? [];
  for (const orphan of items.filter((r) => r.alert === name)) {
    await page.request
      .delete(`/api/v2/rules/${orphan.id}`, { headers: await authHeaders(page) })
      .catch(() => undefined);
  }
}

function thresholdRuleBody(name: string): unknown {
  return {
    alert: name,
    alertType: 'METRIC_BASED_ALERT',
    ruleType: 'threshold_rule',
    condition: {
      thresholds: {
        kind: 'basic',
        spec: [{ name: 'critical', target: 0, matchType: '1', op: '1', channels: [], targetUnit: '' }],
      },
      compositeQuery: {
        queryType: 'builder',
        panelType: 'graph',
        queries: [
          {
            type: 'builder_query',
            spec: {
              name: 'A',
              signal: 'metrics',
              source: '',
              stepInterval: null,
              disabled: false,
              filter: { expression: '' },
              having: { expression: '' },
              aggregations: [
                { metricName: 'app.currency_counter', timeAggregation: 'rate', spaceAggregation: 'sum' },
              ],
            },
          },
        ],
      },
      selectedQueryName: 'A',
      alertOnAbsent: false,
      requireMinPoints: false,
    },
    annotations: { description: name, summary: name },
    labels: { severity: 'warning' },
    notificationSettings: {
      groupBy: [],
      usePolicy: true,
      renotify: { enabled: false, interval: '30m', alertStates: [] },
    },
    evaluation: { kind: 'rolling', spec: { evalWindow: '5m0s', frequency: '1m' } },
    schemaVersion: 'v2alpha1',
    source: 'cascade-delete.spec.ts',
    version: 'v5',
  };
}

test('TC-06 cascade-delete — 409 on linked rule and linked downtime', async ({ authedPage: page }) => {
  const ruleName = 'cascade-rule';
  const downtimeName = 'cascade-downtime';
  let ruleId: string | undefined;
  let downtimeId: string | undefined;

  try {
    await page.goto('/alerts?tab=AlertRules');
    await purgeDowntimesByName(page, downtimeName);
    await purgeRulesByName(page, ruleName);

    // Seed the pair via API — this test's focus is the BE 409 contract
    // surfaced through the UI delete flow, not the creation UX.
    const ruleResp = await page.request.post('/api/v2/rules', {
      data: thresholdRuleBody(ruleName),
      headers: await authHeaders(page),
    });
    expect(ruleResp.status()).toBe(201);
    ruleId = (await ruleResp.json()).data.id as string;

    const now = Date.now();
    const dtResp = await page.request.post('/api/v1/downtime_schedules', {
      data: {
        name: downtimeName,
        description: 'cascade-delete.spec.ts',
        schedule: {
          timezone: 'UTC',
          startTime: new Date(now).toISOString(),
          endTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          recurrence: null,
        },
        alertIds: [ruleId],
      },
      headers: await authHeaders(page),
    });
    expect(dtResp.status()).toBeLessThan(300);
    const dtJson = await dtResp.json();
    downtimeId = (dtJson.data?.id ?? dtJson.id) as string;

    // Trigger rule delete via the list action menu. Capture the 409 from
    // the network layer — the actual UI toast carries the same message
    // but asserting on toasts is tenant-state-sensitive (stacking).
    await page.goto('/alerts?tab=AlertRules');
    const row = page.locator('tr', { hasText: ruleName });
    await expect(row).toBeVisible();
    await row.locator('[data-testid="alert-actions"] button').first().click();
    const ruleDeleteWait = page.waitForResponse(
      (r) => r.url().includes(`/rules/${ruleId}`) && r.request().method() === 'DELETE',
    );
    await page.getByRole('menuitem').filter({ hasText: /^delete$/i }).click();
    const ruleDelResp = await ruleDeleteWait;
    // The V1 delete endpoint that the UI action-menu hits surfaces the
    // underlying FK constraint as a 409. The V2 endpoint wraps this in
    // a friendlier `already_exists` shape but isn't what the list UI calls.
    expect(ruleDelResp.status()).toBe(409);
    const ruleBodyText = await ruleDelResp.text();
    expect(ruleBodyText).toMatch(/planned_maintenance_rule|foreign key|cannot delete rule|referenced/i);

    // Direct API 409 probe for the downtime side. The planned-downtime
    // list uses accordion/lucide-SVG controls that aren't testid-tagged;
    // the UI-trigger assertion is covered by the rule side above.
    const dtDelResp = await page.request.delete(`/api/v1/downtime_schedules/${downtimeId}`, {
      headers: await authHeaders(page),
    });
    expect(dtDelResp.status()).toBe(409);
    const dtBodyText = await dtDelResp.text();
    expect(dtBodyText).toMatch(
      /already_exists|cannot delete planned maintenance|referenced|foreign key/i,
    );
  } finally {
    // Unlink to break the cycle, then drop both.
    if (downtimeId) {
      await page.request
        .put(`/api/v1/downtime_schedules/${downtimeId}`, {
          data: {
            name: downtimeName,
            description: 'cleanup',
            schedule: {
              timezone: 'UTC',
              startTime: new Date(Date.now()).toISOString(),
              endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              recurrence: null,
            },
            alertIds: [],
          },
          headers: await authHeaders(page),
        })
        .catch(() => undefined);
      await page.request
        .delete(`/api/v1/downtime_schedules/${downtimeId}`, { headers: await authHeaders(page) })
        .catch(() => undefined);
    }
    if (ruleId) {
      await page.request
        .delete(`/api/v2/rules/${ruleId}`, { headers: await authHeaders(page) })
        .catch(() => undefined);
    }
  }
});
