import { expect, type Locator, type Page } from '@playwright/test';

import { apiDriver } from '../api';

import { ALERTS_LIST_PATH } from './constants';

/**
 * The Alerts page's Configuration tab: planned downtime and routing policies.
 * Both are antd forms with almost no testids, so every locator here goes
 * through a role, a placeholder or the modal's own class.
 */

/** The slice of `GET /api/v1/downtime_schedules` the specs assert on. */
export interface StoredDowntime {
	id: string;
	name: string;
	alertIds: string[] | null;
	scope?: string;
	schedule: { timezone: string; startTime: string; endTime?: string };
}

export interface StoredRoutingPolicy {
	id: string;
	name: string;
	expression: string;
	channels: string[];
	description?: string;
}

export interface PlannedDowntime {
	goto(): Promise<void>;
	newButton(): Locator;
	form(): Locator;
	fillName(name: string): Promise<void>;
	/** Pick a day in the Starts from / Ends on picker, at the picker's default time. */
	pickDate(field: 'Starts from' | 'Ends on', day: Date): Promise<void>;
	pickTimezone(timezone: string): Promise<void>;
	scope(value: 'All alert rules' | 'Specific alert rules'): Locator;
	rulePicker(): Locator;
	pickRule(name: string): Promise<void>;
	/** The chip for a picked rule. Labels past 20 characters are truncated. */
	pickedRule(name: string): Locator;
	save(): Promise<void>;
	row(name: string): Locator;
	remove(name: string): Promise<void>;
	list(): Promise<StoredDowntime[]>;
	byName(name: string): Promise<StoredDowntime | undefined>;
	tryDelete(name: string): Promise<void>;
}

export interface RoutingPolicies {
	goto(): Promise<void>;
	newButton(): Locator;
	/** Hover the create button and return the tooltip it shows. */
	newButtonTooltip(): Promise<Locator>;
	fill(policy: {
		name?: string;
		description?: string;
		expression?: string;
		channel?: string;
	}): Promise<void>;
	save(): Promise<void>;
	row(name: string): Locator;
	edit(name: string): Promise<void>;
	remove(name: string): Promise<void>;
	byName(name: string): Promise<StoredRoutingPolicy | undefined>;
	tryDelete(name: string): Promise<void>;
}

const dayTitle = (day: Date): string =>
	[
		day.getFullYear(),
		String(day.getMonth() + 1).padStart(2, '0'),
		String(day.getDate()).padStart(2, '0'),
	].join('-');

export function plannedDowntimeDriver(page: Page): PlannedDowntime {
	const api = apiDriver(page);
	const form = (): Locator => page.locator('.createDowntimeModal');
	const openPicker = (): Locator =>
		page.locator('.datePicker:not(.ant-picker-dropdown-hidden)');

	const downtime: PlannedDowntime = {
		goto: async () => {
			await page.goto(
				`${ALERTS_LIST_PATH}?tab=Configuration&subTab=planned-downtime`,
			);
			await expect(downtime.newButton()).toBeVisible();
		},

		newButton: () => page.getByRole('button', { name: 'New downtime' }),
		form,

		fillName: async (name) => {
			await form().getByRole('textbox', { name: 'Name' }).fill(name);
		},

		pickDate: async (field, day) => {
			await form().getByRole('textbox', { name: field }).click();
			const picker = openPicker();
			await picker.locator(`td[title="${dayTitle(day)}"]`).click();
			await picker.getByRole('button', { name: 'OK' }).click();
			await expect(picker).toHaveCount(0);
		},

		pickTimezone: async (timezone) => {
			const select = form().getByRole('combobox', { name: 'Timezone' });
			await select.fill(timezone);
			await page
				.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
				.locator('.ant-select-item-option')
				.filter({ hasText: new RegExp(`^${timezone}$`) })
				.first()
				.click();
		},

		scope: (value) => form().getByRole('radio', { name: value }),

		rulePicker: () =>
			form().locator('.ant-select').filter({ hasText: 'Search for alert rules' }),

		pickRule: async (name) => {
			const select = downtime.rulePicker();
			await select.click();
			await select.locator('input[role="combobox"]').fill(name);
			await page
				.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
				.locator('.ant-select-item-option')
				.filter({ hasText: name })
				.first()
				.click();
			await page.keyboard.press('Escape');
		},

		pickedRule: (name) =>
			form().locator('.alert-rule-tags').getByText(name, { exact: true }),

		save: async () => {
			await form().getByRole('button', { name: 'Add downtime schedule' }).click();
			await expect(form()).toHaveCount(0);
		},

		row: (name) => page.locator('.ant-collapse-item').filter({ hasText: name }),

		// The delete control is a bare icon with an onClick and no label; it is
		// the second of the header's two action icons.
		remove: async (name) => {
			await downtime.row(name).locator('.action-btn svg').nth(1).click();
			await page.getByRole('button', { name: 'Delete Schedule' }).click();
			await expect(downtime.row(name)).toHaveCount(0);
		},

		list: async () =>
			(
				await api.get<{ data: StoredDowntime[] | null }>(
					'/api/v1/downtime_schedules',
				)
			).data ?? [],

		byName: async (name) =>
			(await downtime.list()).find((entry) => entry.name === name),

		// A schedule still naming rules refuses deletion with a 409, and those
		// rules refuse it in turn, so detach them first.
		tryDelete: async (name) => {
			const found = await downtime.byName(name).catch(() => undefined);
			if (!found) {
				return;
			}
			if ((found.alertIds ?? []).length > 0) {
				await api
					.put(`/api/v1/downtime_schedules/${found.id}`, {
						name: found.name,
						alertIds: [],
						schedule: found.schedule,
						scope: found.scope ?? '',
					})
					.catch(() => undefined);
			}
			await api.tryDel(`/api/v1/downtime_schedules/${found.id}`);
		},
	};

	return downtime;
}

export function routingPoliciesDriver(page: Page): RoutingPolicies {
	const api = apiDriver(page);
	const modal = (): Locator => page.locator('.create-policy-modal');

	const byName = async (
		name: string,
	): Promise<StoredRoutingPolicy | undefined> =>
		(
			(
				await api.get<{ data: StoredRoutingPolicy[] | null }>(
					'/api/v1/route_policies',
				)
			).data ?? []
		).find((entry) => entry.name === name);

	const routing: RoutingPolicies = {
		goto: async () => {
			await page.goto(
				`${ALERTS_LIST_PATH}?tab=Configuration&subTab=routing-policies`,
			);
			await expect(routing.newButton()).toBeVisible();
		},

		newButton: () => page.getByRole('button', { name: 'New routing policy' }),

		newButtonTooltip: async () => {
			await routing.newButton().hover();
			return page.getByRole('tooltip');
		},

		fill: async ({ name, description, expression, channel }) => {
			if (name !== undefined) {
				await modal().getByPlaceholder('e.g. Base routing policy...').fill(name);
			}
			if (description !== undefined) {
				await modal()
					.getByPlaceholder('e.g. This is a routing policy that...')
					.fill(description);
			}
			if (expression !== undefined) {
				await modal()
					.getByPlaceholder(/^e\.g\. service\.name ==/)
					.fill(expression);
			}
			if (channel !== undefined) {
				const select = modal().locator('.ant-select');
				await select.click();
				await select.locator('input[role="combobox"]').fill(channel);
				await page
					.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
					.locator('.ant-select-item-option')
					.filter({ hasText: channel })
					.first()
					.click();
				await page.keyboard.press('Escape');
			}
		},

		save: async () => {
			await modal().getByRole('button', { name: 'Save Routing Policy' }).click();
			await expect(modal()).toHaveCount(0);
		},

		row: (name) =>
			page.locator('.policy-list-item-header').filter({ hasText: name }),

		edit: async (name) => {
			await routing.row(name).getByTestId('edit-routing-policy').click();
			await expect(modal()).toBeVisible();
		},

		remove: async (name) => {
			await routing.row(name).getByTestId('delete-routing-policy').click();
			await page.getByRole('button', { name: 'Delete Routing Policy' }).click();
			await expect(routing.row(name)).toHaveCount(0);
		},

		byName,

		tryDelete: async (name) => {
			const found = await byName(name).catch(() => undefined);
			if (found) {
				await api.tryDel(`/api/v1/route_policies/${found.id}`);
			}
		},
	};

	return routing;
}
