import {
	expect,
	type Locator,
	type Page,
	type Request,
	type Response,
} from '@playwright/test';

import { antdDriver, type Antd } from '../antd';
import { apiDriver } from '../api';
import { collectRequests } from '../console';
import { driver, type Layer } from '../kit';
import { tanstackDriver, type Tanstack } from '../tanstack';

import {
	ALERT_CHANNEL_EDIT_PATH,
	ALERT_EDIT_PATH,
	ALERT_HISTORY_PATH,
	ALERT_LIST_PAGE_SIZE,
	ALERT_OVERVIEW_PATH,
	ALERTS_LIST_PATH,
	ALERTS_NEW_PATH,
	AlertType,
	type AlertTypeValue,
	DEFAULT_RELATIVE_TIME,
	EVALUATION_WINDOW_PRESETS,
	RuleType,
	STOCK_ALERT_TYPE_CARDS,
	TIMELINE_PAGE_SIZE,
	WAIT_TIMELINE_ENTRIES_DEFAULT,
	WAIT_TIMELINE_STATES_DEFAULT,
} from './constants';
import {
	plannedDowntimeDriver,
	routingPoliciesDriver,
	type PlannedDowntime,
	type RoutingPolicies,
} from './configuration';
import { alertSeeder, type AlertSeeder } from './seed';
import type { TimelineItem, TimelineResponse } from './types';

/**
 * The alerts driver: one object per surface, all bound to one page.
 *
 * Everything a spec needs to reach the alerts UI is here — the list, the create
 * builder, the details shell and the history tab — plus `seed` for the API side
 * and `antd` for the widget primitives underneath.
 */

// ─── Page shell ──────────────────────────────────────────────────────────────

export interface AlertsShell {
	/** Open `/alerts` with exactly `params` and wait for nothing: which pane
	 * renders, the table or the empty state, is what the caller asserts. */
	goto(params?: Record<string, string>): Promise<void>;
	tab(name: string | RegExp): Locator;
	rulesHeading(): Locator;
	triggeredSearch(): Locator;
	breadcrumb(): Locator;
	crumb(text: string): Locator;
	crumbButton(name: string): Locator;
	/** A toast or notification, by its text. */
	message(text: string | RegExp): Locator;
	/** Every request the page makes from this call on. */
	recordRequests(): Request[];
}

// ─── Channels ────────────────────────────────────────────────────────────────

export interface AlertChannels {
	gotoEdit(id: string): Promise<void>;
	/** The email channel's recipients field. */
	recipients(): Locator;
	saveButton(): Locator;
	/** A channel on the Channels tab, by name. */
	entry(name: string): Locator;
	newButton(): Locator;
}

// ─── List ────────────────────────────────────────────────────────────────────

export interface AlertList {
	table: Tanstack;
	/**
	 * Open the rules list. `limit` defaults to a fixed page size so row counts
	 * never depend on viewport height. Pass `expectRows: false` for filters that
	 * are *meant* to match nothing.
	 */
	goto(
		params?: Record<string, string>,
		options?: { expectRows?: boolean },
	): Promise<void>;
	rows(): Locator;
	rowFor(name: string): Locator;
	/** The STATE cell of `ruleId`'s row — `OK`, `Disabled`, `Firing`. */
	stateCell(ruleId: string): Locator;
	search(): Locator;
	searchFor(text: string): Promise<void>;
	openRowActions(name: string): Promise<void>;
	openFirstRowActions(): Promise<void>;
	menuItem(label: string | RegExp): Locator;
	newAlertButton(): Locator;
	/** A header cell, by its rendered text. */
	columnHeader(name: string): Locator;
	/** A header's sort control, by its rendered text. */
	sortButton(name: string): Locator;
	nextPageButton(): Locator;
	pageSizeSelect(): Locator;
	pageSizeOption(size: number): Locator;
	/** A rule's name anywhere on the page, such as a clone's `<name> - Copy`. */
	ruleName(name: string, options?: { exact?: boolean }): Locator;
}

// ─── Create / edit form ──────────────────────────────────────────────────────

export interface AlertForm {
	gotoTypeSelection(): Promise<void>;
	typeCard(type: AlertTypeValue): Locator;
	typeCards(): Locator;
	/** Whether the anomaly card is present, i.e. whether the flag is on for this
	 * stack. Card-count assertions branch on it rather than hard-coding four. */
	hasAnomalyCard(): Promise<boolean>;
	expectTypeCardSet(): Promise<void>;
	url(options?: CreateAlertUrlOptions): string;
	gotoV2(options?: Omit<CreateAlertUrlOptions, 'classic'>): Promise<void>;
	gotoV1(options?: Omit<CreateAlertUrlOptions, 'classic'>): Promise<void>;

	name(): Locator;
	saveButton(): Locator;
	testButton(): Locator;
	discardButton(): Locator;
	/** Hover the disabled Save and read the validator's message — the only way to
	 * see it, since the button cannot be clicked while a message exists. */
	saveTooltip(): Promise<string>;
	/** Click Discard through `dispatchEvent`; see the note in the implementation. */
	discard(): Promise<void>;

	thresholdRows(): Locator;
	thresholdRow(index: number): Locator;
	thresholdValue(index?: number): Locator;
	selectThresholdChannel(index: number, channelName: string): Promise<void>;
	addLabel(key: string, value: string): Promise<void>;
	labelPill(key: string, value: string): Locator;
	v1SaveButton(): Locator;

	advancedOptionToggle(containerTestId: string): Locator;
	expandAdvancedOptions(): Promise<void>;
	evaluationSettingsButton(): Locator;
	openEvaluationSettings(): Promise<void>;
	evaluationWindowOption(
		section: 'window-type' | 'timeframe',
		value: string,
	): Locator;
	selectEvaluationTimeframe(
		value: keyof typeof EVALUATION_WINDOW_PRESETS,
	): Promise<void>;
	evaluationCadenceInput(): Locator;
	evaluationCadenceUnitSelect(): Locator;
	/** Serve `GET /api/v1/channels` empty — the one stub in the alerts suite. */
	stubNoChannels(): Promise<void>;
	/** The class name of whatever is on top at a point, for the covered-Discard
	 * defect: the side navigation, not the footer, receives the click. */
	elementAtPointClassName(x: number, y: number): Promise<string>;

	typeSelectionTitle(): Locator;
	switchToClassicButton(): Locator;
	/** The "New Alert Rule" chip, which the create header shows and edit hides. */
	newRuleChip(): Locator;
	addThresholdButton(): Locator;
	thresholdName(index?: number): Locator;
	thresholdOperatorSelect(): Locator;
	thresholdMatchTypeSelect(): Locator;
	recoveryThresholdValue(): Locator;
	thresholdChannelSelects(): Locator;
	/** Open a threshold's channel select and return its own dropdown. */
	openChannelDropdown(index?: number): Promise<ChannelDropdown>;
	routingPoliciesSwitch(): Locator;
	viewRoutingPoliciesButton(): Locator;
	repeatNotificationsInterval(): Locator;
	repeatNotificationsUnitSelect(): Locator;
	repeatNotificationsConditionsSelect(): Locator;
	missingDataToleranceInput(): Locator;
	minimumDatapointsInput(): Locator;
	customScheduleEditor(): Locator;
	/** The shared modal every save error lands in, for both forms. */
	errorModal(): Locator;
	errorModalCloseButton(): Locator;
}

/** `NotificationChannelsNotFoundContent`, rendered inside a channel dropdown. */
export interface ChannelDropdown {
	emptyMessage(): Locator;
	createHereButton(): Locator;
	refreshButton(): Locator;
	askAdminMessage(): Locator;
}

export interface CreateAlertUrlOptions {
	alertType?: AlertTypeValue;
	ruleType?: string;
	/** Sets `showClassicCreateAlertsPage=true` ⇒ the v1 classic form. */
	classic?: boolean;
	/** Merged in last, so it can override anything above. */
	params?: Record<string, string>;
}

// ─── Details shell ───────────────────────────────────────────────────────────

export interface AlertDetails {
	/** The details shell (Overview tab), waiting only for the shell to mount. */
	goto(ruleId: string, params?: Record<string, string>): Promise<void>;
	/** The overview editor, waiting for the condition editor *and* the serialised
	 * query — without the second half an assertion races the builder's rewrite. */
	gotoOverview(ruleId: string): Promise<void>;
	/** `/alerts/edit`, the legacy alias; omit `ruleId` to send none. */
	gotoEdit(ruleId?: string): Promise<void>;
	/** Navigate only, for ids that never resolve; omit `ruleId` to send none. */
	open(ruleId?: string): Promise<void>;
	root(): Locator;
	tab(name: string | RegExp): Locator;
	openActions(): Promise<void>;
	menuItem(label: string | RegExp): Locator;
	nameInput(): Locator;
	/** The Overview and History tabs, by their testids. */
	sectionTab(key: 'overview' | 'history'): Locator;
	historyBetaBadge(): Locator;
	enableToggle(): Locator;
	copyLinkButton(): Locator;
	/** The static v1 header; v2 renders `nameInput()` instead. */
	headerField(field: 'title' | 'state' | 'severity' | 'labels'): Locator;
	renameInput(): Locator;
	renameConfirmButton(): Locator;
	/** Found by label, so it also proves the History tab renders none. */
	footerSaveButton(): Locator;
	notFound(): Locator;
	notFoundMessage(): Locator;
	editRulesError(): Locator;
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface AlertHistory {
	goto(ruleId: string, params?: Record<string, string>): Promise<void>;
	/** Navigate only, for rule ids that never reach the table. */
	open(ruleId: string): Promise<void>;
	table(): Locator;
	timelineTitle(): Locator;
	timelineTab(key: 'overall-status' | 'top-contributors'): Locator;
	stateFilter(key: 'all' | 'fired' | 'resolved'): Locator;
	prevPageButton(): Locator;
	nextPageButton(): Locator;
	/** A cell of `row`; pass `rows()` for that cell in every row. */
	rowCell(
		row: Locator,
		cell: 'state' | 'labels' | 'created-at' | 'actions',
	): Locator;
	viewLogsLink(): Locator;
	viewTracesLink(): Locator;
	error(): Locator;
	filterSearch(): Locator;
	filterSkeleton(): Locator;
	filterEditor(): Locator;
	suggestions(): Locator;
	runQueryButton(): Locator;
	cancelQueryButton(): Locator;
	timeRangeInput(): Locator;
	timeRangeOption(label: string): Locator;
	statsCardValue(title: string): Locator;
	statsCardChange(title: string): Locator;
	statsCardSparkline(title: string): Locator;
	graph(): Locator;
	graphCanvas(): Locator;
	graphTitle(): Locator;
	contributorsCard(): Locator;
	contributorsViewAll(): Locator;
	contributorsDrawer(): Locator;
	contributorsDrawerTitle(): Locator;
	contributorsDrawerTotal(): Locator;
	/** Contributor rows inside `scope`, or anywhere on the page. */
	contributorRows(scope?: Locator): Locator;
	contributorCount(row: Locator): Locator;
	contributorBar(row: Locator): Locator;
	rows(): Locator;
	rowLabels(): Promise<string[]>;
	firstRowCreatedAt(): Promise<string>;
	footerRange(): Locator;
	statsCard(title: string): Locator;
	openRowActions(index: number): Promise<void>;
	expectFirstPage(): Promise<void>;

	/** Read the timeline straight from the API, to gate on the ruler having
	 * produced rows before the UI is opened. */
	fetchTimeline(
		ruleId: string,
		params?: Record<string, string | number>,
	): Promise<TimelineResponse>;
	readTotal(ruleId: string): Promise<number>;
	waitForEntries(
		ruleId: string,
		options: { min: number; state?: string; timeoutMs?: number },
	): Promise<TimelineResponse>;
	waitForStates(
		ruleId: string,
		options: { states: Record<string, number>; timeoutMs?: number },
	): Promise<TimelineResponse>;

	isRequest(request: Request, endpoint: HistoryEndpoint): boolean;
	waitForResponse(
		endpoint: HistoryEndpoint,
		options?: { status?: number; filterExpression?: string },
	): Promise<Response>;
	/** Type into the expression editor without running it — for suggestions. */
	typeFilter(expression: string): Promise<void>;
	runFilter(expression: string): Promise<void>;
	sortDescending(): Promise<void>;
	/** The exact cursor the UI sends for `page`, byte-identical to the server's. */
	cursorFor(page: number, limit?: number): string | undefined;
	labelsOf(item: TimelineItem): Record<string, string>;
}

/** The four v2 endpoints one history page load hits. */
export const HISTORY_ENDPOINTS = [
	'stats',
	'timeline',
	'top_contributors',
	'overall_status',
] as const;

export type HistoryEndpoint = (typeof HISTORY_ENDPOINTS)[number];

export interface Alerts {
	seed: AlertSeeder;
	antd: Antd;
	shell: AlertsShell;
	channels: AlertChannels;
	list: AlertList;
	form: AlertForm;
	details: AlertDetails;
	history: AlertHistory;
	downtime: PlannedDowntime;
	routing: RoutingPolicies;
}

export function alertsDriver(page: Page): Alerts {
	const antd = antdDriver(page);
	const seed = alertSeeder(page);

	const table = tanstackDriver(page, { tableKey: 'alert-rules' });

	const shell: AlertsShell = {
		goto: async (params = {}) => {
			const query = new URLSearchParams(params).toString();
			await page.goto(query ? `${ALERTS_LIST_PATH}?${query}` : ALERTS_LIST_PATH);
		},

		tab: (name) => page.getByRole('tab', { name }),
		rulesHeading: () => page.getByRole('heading', { name: 'Alert Rules' }),
		triggeredSearch: () => page.getByTestId('triggered-alerts-search-input'),
		breadcrumb: () => page.locator('.ant-breadcrumb'),
		crumb: (text) => shell.breadcrumb().getByText(text),
		crumbButton: (name) => shell.breadcrumb().getByRole('button', { name }),
		message: (text) => page.getByText(text),
		recordRequests: () => collectRequests(page),
	};

	const channels: AlertChannels = {
		gotoEdit: async (id) => {
			await page.goto(`${ALERT_CHANNEL_EDIT_PATH}/${id}`);
		},

		recipients: () => page.getByRole('textbox', { name: 'To' }),
		saveButton: () => page.getByTestId('save-channel-button'),
		entry: (name) => page.getByText(name),
		newButton: () => page.getByRole('button', { name: /new alert channel/i }),
	};

	const list: AlertList = {
		table,

		goto: async (params = {}, { expectRows = true } = {}) => {
			const query = new URLSearchParams({
				limit: String(ALERT_LIST_PAGE_SIZE),
				...params,
			});
			await page.goto(`${ALERTS_LIST_PATH}?${query.toString()}`);
			await expect(list.search()).toBeVisible();
			if (expectRows) {
				// Skeleton rows are empty and ignore clicks; wait for a loaded one.
				await expect(list.rows().first()).toHaveText(/\S/);
			}
		},

		rows: () => page.locator('tbody tr'),
		rowFor: (name) => page.locator('tbody tr', { hasText: name }).first(),
		stateCell: (ruleId) => page.getByTestId(`alert-row-${ruleId}-state`),
		search: () => page.getByTestId('list-alerts-search-input'),

		searchFor: async (text) => {
			await list.search().fill(text);
			await expect(page).toHaveURL(new RegExp(`search=${text}`));
		},

		openRowActions: async (name) => {
			await list.rowFor(name).getByTestId('alert-actions').click();
		},

		openFirstRowActions: async () => {
			await list.rows().first().getByTestId('alert-actions').click();
		},

		menuItem: (label) => page.getByRole('menuitem').filter({ hasText: label }),
		newAlertButton: () => page.getByTestId('list-alerts-new-alert-button'),
		columnHeader: (name) => page.getByRole('columnheader', { name }),
		sortButton: (name) => page.getByRole('button', { name }),
		nextPageButton: () => page.getByLabel('Go to next page'),
		pageSizeSelect: () => page.getByTestId('pagination-page-size'),
		pageSizeOption: (size) =>
			page.getByRole('option', { name: String(size), exact: true }),
		ruleName: (name, options) => page.getByText(name, options),
	};

	const form: AlertForm = {
		gotoTypeSelection: async () => {
			// `isTypeSelectionMode` is `!alertType && !ruleType && !compositeQuery`,
			// so *any* of those three params skips this page — including a stale
			// `compositeQuery` left over in the URL.
			await page.goto(ALERTS_NEW_PATH);
			await expect(form.typeCard(AlertType.METRICS)).toBeVisible();
		},

		typeCard: (type) => page.getByTestId(`alert-type-card-${type}`),
		typeCards: () => page.locator('[data-testid^="alert-type-card-"]'),

		hasAnomalyCard: async () =>
			(await form.typeCard(AlertType.ANOMALY).count()) > 0,

		/**
		 * Exactly the expected set, in order: the four stock cards, plus anomaly
		 * *first* when the flag is on, because `getOptionList` unshifts it. Written
		 * as an exact set so a fifth signal still fails here.
		 */
		expectTypeCardSet: async () => {
			const expected = (await form.hasAnomalyCard())
				? [AlertType.ANOMALY, ...STOCK_ALERT_TYPE_CARDS]
				: STOCK_ALERT_TYPE_CARDS;
			const cards = form.typeCards();
			await expect(cards).toHaveCount(expected.length);
			const rendered = await cards.evaluateAll((nodes) =>
				nodes.map((node) => node.getAttribute('data-testid')),
			);
			expect(rendered).toEqual(expected.map((type) => `alert-type-card-${type}`));
		},

		url: ({
			alertType = AlertType.LOGS,
			ruleType = RuleType.THRESHOLD,
			classic = false,
			params = {},
		}: CreateAlertUrlOptions = {}) => {
			const search = new URLSearchParams({ alertType, ruleType });
			if (classic) {
				search.set('showClassicCreateAlertsPage', 'true');
			}
			for (const [key, value] of Object.entries(params)) {
				search.set(key, value);
			}
			return `${ALERTS_NEW_PATH}?${search.toString()}`;
		},

		gotoV2: async (options = {}) => {
			await page.goto(form.url({ ...options, classic: false }));
			await expect(form.name()).toBeVisible();
			// `useShareBuilderUrl` serialises the default query shortly after mount;
			// asserting on the URL before that races its rewrite.
			await page.waitForURL(/compositeQuery=/, { timeout: 15_000 });
		},

		gotoV1: async (options = {}) => {
			await page.goto(form.url({ ...options, classic: true }));
			await expect(form.v1SaveButton()).toBeVisible();
		},

		name: () => page.getByTestId('alert-name-input'),
		saveButton: () => page.getByTestId('save-alert-rule-button'),
		testButton: () => page.getByTestId('test-notification-button'),
		discardButton: () => page.getByTestId('discard-alert-rule-button'),
		v1SaveButton: () => page.getByTestId('alert-save-button'),

		saveTooltip: async () => {
			await form.saveButton().hover();
			const tooltip = page.locator('[data-slot="tooltip-content"]').first();
			await expect(tooltip).toBeVisible();
			return (await tooltip.innerText()).trim();
		},

		/**
		 * The footer is `position: fixed; left: 63px` — the *collapsed* rail width —
		 * so Discard sits under the 240px side navigation, which swallows the click.
		 * `{ force: true }` does not help: it skips the actionability wait but still
		 * delivers a real mouse event at those coordinates. `dispatchEvent` bypasses
		 * hit-testing and React's delegated handler fires normally.
		 *
		 * This is a workaround for a **product** bug, not for a flaky test.
		 */
		discard: async () => {
			await form.discardButton().dispatchEvent('click');
		},

		// There is no `threshold-item-<id>` testid: the row is a bare
		// `className="threshold-item"`, so rows are addressed positionally.
		thresholdRows: () => page.locator('.threshold-item'),
		thresholdRow: (index) => form.thresholdRows().nth(index),
		thresholdValue: (index = 0) =>
			page.getByTestId('threshold-value-input').nth(index),

		selectThresholdChannel: async (index, channelName) => {
			await antd.pickByName(
				form.thresholdChannelSelects().nth(index),
				channelName,
			);
		},

		/**
		 * The label editor is one field with two phases, key then value, each
		 * committed with Enter. Committing does *not* close it — `isAdding` stays
		 * true so a user can type several in a row — so Escape is what closes it,
		 * and without that a second call waits forever for the add button.
		 */
		addLabel: async (key, value) => {
			await page.getByTestId('alert-add-label-button').click();
			const input = page.getByTestId('alert-add-label-input');
			await input.fill(key);
			await input.press('Enter');
			await input.fill(value);
			await input.press('Enter');
			await input.press('Escape');
			await expect(page.getByTestId('alert-add-label-button')).toBeVisible();
		},

		labelPill: (key, value) => page.getByTestId(`label-pill-${key}-${value}`),

		// The `Switch` inside an `AdvancedOptionItem` carries no testid of its own,
		// so it is reached through its container's.
		advancedOptionToggle: (containerTestId) =>
			page.getByTestId(containerTestId).locator('[role="switch"]'),

		/**
		 * antd's `Collapse` renders panel children lazily, so the cadence inputs and
		 * the advanced-option containers do not exist in the DOM until this runs.
		 */
		expandAdvancedOptions: async () => {
			const header = page.getByRole('button', { name: /ADVANCED OPTIONS/i });
			if ((await header.getAttribute('aria-expanded')) !== 'true') {
				await header.click();
			}
			await expect(
				page.getByTestId('evaluation-cadence-input-group'),
			).toBeVisible();
		},

		evaluationSettingsButton: () =>
			page.getByTestId('evaluation-settings-button'),

		// The popover's content is only in the DOM while open, so every option
		// lookup has to come after this.
		openEvaluationSettings: async () => {
			await form.evaluationSettingsButton().click();
			await expect(page.locator('.evaluation-window-popover')).toBeVisible();
		},

		// One component renders both lists, keyed by `data-section-id`, and the
		// testid carries the section so a timeframe cannot collide with a type.
		evaluationWindowOption: (section, value) =>
			page.getByTestId(`${section}-option-${value}`),

		// Waiting for the trigger to reflect the pick matters: a spec that saves
		// immediately posts the old window. The popover ignores Escape and can sit
		// over the controls below it, so its trigger closes it.
		selectEvaluationTimeframe: async (value) => {
			await form.openEvaluationSettings();
			await form.evaluationWindowOption('timeframe', value).click();
			await expect(form.evaluationSettingsButton()).toContainText(
				EVALUATION_WINDOW_PRESETS[value],
			);
			await form.evaluationSettingsButton().click();
			await expect(page.locator('.evaluation-window-popover')).toBeHidden();
		},

		evaluationCadenceInput: () =>
			page.getByTestId('evaluation-cadence-duration-input'),
		evaluationCadenceUnitSelect: () =>
			page.getByTestId('evaluation-cadence-unit-select'),

		/**
		 * The **one** place the alerts suite mocks the network, deliberately: zero
		 * channels is a real product state that every fresh install has, it is the
		 * only state that reaches the disabled broadcast switch, and it cannot be
		 * produced server-side because the channel fixture is worker-scoped and
		 * parallel workers share one stack.
		 */
		elementAtPointClassName: (x, y) =>
			page.evaluate(
				([px, py]) => {
					const element = document.elementFromPoint(px, py);
					return element ? String(element.className) : '';
				},
				[x, y],
			),

		stubNoChannels: async () => {
			await page.route('**/api/v1/channels', async (route) => {
				if (route.request().method() !== 'GET') {
					await route.fallback();
					return;
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ status: 'success', data: [] }),
				});
			});
		},

		typeSelectionTitle: () => page.getByText('Choose a type for the alert'),
		switchToClassicButton: () =>
			page.getByRole('button', { name: 'Switch to Classic Experience' }),
		newRuleChip: () => page.getByText('New Alert Rule'),
		addThresholdButton: () => page.getByTestId('add-threshold-button'),
		thresholdName: (index = 0) =>
			page.getByTestId('threshold-name-input').nth(index),
		thresholdOperatorSelect: () =>
			page.getByTestId('alert-threshold-operator-select'),
		thresholdMatchTypeSelect: () =>
			page.getByTestId('alert-threshold-match-type-select'),
		recoveryThresholdValue: () =>
			page.getByTestId('recovery-threshold-value-input'),
		thresholdChannelSelects: () =>
			page.getByTestId('threshold-notification-channel-select'),

		openChannelDropdown: async (index = 0) => {
			const select = form.thresholdChannelSelects().nth(index);
			await select.click();
			const dropdown = await antd.ownDropdown(select);
			return {
				emptyMessage: () => dropdown.getByText('No channels yet.'),
				createHereButton: () => dropdown.getByRole('button', { name: 'here.' }),
				refreshButton: () => dropdown.getByRole('button', { name: 'Refresh' }),
				askAdminMessage: () =>
					dropdown.getByText('Please ask your admin to create one.'),
			};
		},

		routingPoliciesSwitch: () => page.getByTestId('routing-policies-switch'),
		viewRoutingPoliciesButton: () =>
			page.getByTestId('view-routing-policies-button'),
		repeatNotificationsInterval: () =>
			page.getByTestId('repeat-notifications-time-input'),
		repeatNotificationsUnitSelect: () =>
			page.getByTestId('repeat-notifications-unit-select'),
		repeatNotificationsConditionsSelect: () =>
			page.getByTestId('repeat-notifications-conditions-select'),
		missingDataToleranceInput: () =>
			page.getByTestId('send-notification-if-data-is-missing-input'),
		minimumDatapointsInput: () =>
			page.getByTestId('enforce-minimum-datapoints-input'),
		customScheduleEditor: () => page.locator('.edit-custom-schedule'),
		errorModal: () => page.locator('.error-modal__wrap'),
		errorModalCloseButton: () => page.getByTestId('close-button'),
	};

	const details: AlertDetails = {
		goto: async (ruleId, params = {}) => {
			const query = new URLSearchParams({
				ruleId,
				relativeTime: DEFAULT_RELATIVE_TIME,
				...params,
			});
			await page.goto(`${ALERT_OVERVIEW_PATH}?${query.toString()}`);
			await expect(details.root()).toBeVisible();
		},

		gotoOverview: async (ruleId) => {
			await page.goto(`${ALERT_OVERVIEW_PATH}?ruleId=${ruleId}`);
			// `.first()`: a rule may have several thresholds and the editor renders
			// one input per threshold, so an unscoped locator is a strict-mode
			// violation that only appears once the second row has rendered.
			await expect(form.thresholdValue()).toBeVisible();
			await page.waitForURL(/compositeQuery=/, { timeout: 15_000 });
		},

		gotoEdit: async (ruleId) => {
			await page.goto(
				ruleId === undefined
					? ALERT_EDIT_PATH
					: `${ALERT_EDIT_PATH}?ruleId=${ruleId}`,
			);
		},

		open: async (ruleId) => {
			await page.goto(
				ruleId === undefined
					? ALERT_OVERVIEW_PATH
					: `${ALERT_OVERVIEW_PATH}?ruleId=${ruleId}`,
			);
		},

		root: () => page.getByTestId('alert-details-root'),
		tab: (name) => page.getByRole('tab', { name }),
		menuItem: (label) => page.getByRole('menuitem').filter({ hasText: label }),
		nameInput: () => page.getByTestId('alert-name-input'),

		openActions: async () => {
			await page.getByTestId('alert-actions-menu').click();
		},

		sectionTab: (key) => page.getByTestId(`alert-details-tab-${key}`),
		historyBetaBadge: () => details.sectionTab('history').getByText('Beta'),
		enableToggle: () => page.getByTestId('alert-actions-toggle'),
		copyLinkButton: () => page.getByRole('button', { name: 'Copy link' }),
		headerField: (field) => page.getByTestId(`alert-header-${field}`),
		renameInput: () => page.getByTestId('alert-name'),
		renameConfirmButton: () => page.getByRole('button', { name: 'Rename Alert' }),
		footerSaveButton: () => page.getByRole('button', { name: 'Save Alert Rule' }),
		notFound: () => page.locator('.alert-not-found'),
		notFoundMessage: () =>
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		editRulesError: () => page.locator('.edit-rules-container--error'),
	};

	const historyApi = (
		ruleId: string,
		params: Record<string, string | number> = {},
	): Promise<TimelineResponse> => {
		const now = Date.now();
		const query = new URLSearchParams({
			start: String(now - 30 * 60 * 1000),
			end: String(now),
			limit: '100',
			order: 'asc',
			...Object.fromEntries(
				Object.entries(params).map(([key, value]) => [key, String(value)]),
			),
		});
		return apiDriver(page)
			.get<{ data: TimelineResponse | null }>(
				`/api/v2/rules/${ruleId}/history/timeline?${query.toString()}`,
			)
			.then((body) => ({
				items: body.data?.items ?? [],
				total: body.data?.total ?? 0,
				nextCursor: body.data?.nextCursor,
			}));
	};

	const countStates = (items: TimelineItem[]): Record<string, number> =>
		items.reduce<Record<string, number>>((acc, item) => {
			acc[item.state] = (acc[item.state] ?? 0) + 1;
			return acc;
		}, {});

	const history: AlertHistory = {
		goto: async (ruleId, params = {}) => {
			// An absolute window and `relativeTime` are mutually exclusive in
			// practice: with both present the time picker normalises back to the
			// relative range and drops `startTime`/`endTime`, so the absolute window
			// never takes effect.
			const hasAbsoluteRange = !!params.startTime && !!params.endTime;
			const query = new URLSearchParams({
				ruleId,
				...(hasAbsoluteRange ? {} : { relativeTime: DEFAULT_RELATIVE_TIME }),
				...params,
			});
			await page.goto(`${ALERT_HISTORY_PATH}?${query.toString()}`);

			// Race the table against the app's error boundary: the history page has
			// been seen crashing into it on load, and without this the failure reads
			// as "timeline-table not found", which says nothing about why.
			const table_ = history.table();
			const crashed = page.getByText('Something went wrong :/');
			await expect(table_.or(crashed)).toBeVisible();
			if (await crashed.isVisible()) {
				throw new Error(
					`alert history crashed into the app error boundary at ${page.url()} — ` +
						'a component threw during render; check the captured console output',
				);
			}
			await expect(table_).toBeVisible();
			// The node is rendered by the first paint, *before* the timeline request
			// settles — antd only overlays a spinner. Returning here would leave that
			// request in flight and the spec's next `waitForResponse` would resolve
			// with the page load instead of its own interaction.
			await expect(page.locator('.timeline-table .ant-spin-spinning')).toHaveCount(
				0,
			);
		},

		open: async (ruleId) => {
			await page.goto(`${ALERT_HISTORY_PATH}?ruleId=${ruleId}`);
		},

		table: () => page.getByTestId('timeline-table'),
		timelineTitle: () => page.locator('.timeline__title'),
		timelineTab: (key) => page.getByTestId(`timeline-tab-${key}`),
		stateFilter: (key) => page.getByTestId(`timeline-filter-${key}`),
		prevPageButton: () => page.getByTestId('timeline-prev-page'),
		nextPageButton: () => page.getByTestId('timeline-next-page'),
		rowCell: (row, cell) => row.getByTestId(`timeline-row-${cell}`),
		viewLogsLink: () => page.getByTestId('alert-popover-view-logs'),
		viewTracesLink: () => page.getByTestId('alert-popover-view-traces'),
		error: () => page.getByTestId('timeline-error'),
		filterSearch: () => page.getByTestId('timeline-filter-search'),
		filterSkeleton: () => page.getByTestId('timeline-filter-skeleton'),
		filterEditor: () => page.locator('.query-where-clause-editor .cm-content'),
		suggestions: () => page.locator('.cm-tooltip-autocomplete li'),
		runQueryButton: () => page.getByRole('button', { name: /run query/i }),
		cancelQueryButton: () => page.getByRole('button', { name: 'Cancel' }),
		timeRangeInput: () => page.locator('.filters input').first(),
		timeRangeOption: (label) => page.getByText(label, { exact: true }),
		statsCardValue: (title) =>
			history.statsCard(title).getByTestId('stats-card-value'),
		statsCardChange: (title) =>
			history.statsCard(title).getByTestId('stats-card-change'),
		statsCardSparkline: (title) =>
			history.statsCard(title).getByTestId('stats-card-sparkline'),
		graph: () => page.getByTestId('timeline-graph'),
		graphCanvas: () => history.graph().locator('canvas'),
		graphTitle: () => page.getByTestId('timeline-graph-title'),
		contributorsCard: () => page.getByTestId('top-contributors-card'),
		contributorsViewAll: () => page.getByTestId('top-contributors-view-all'),
		contributorsDrawer: () => page.getByTestId('top-contributors-drawer'),
		contributorsDrawerTitle: () => page.getByText('Viewing All Contributors'),
		contributorsDrawerTotal: () => history.contributorsDrawer().locator('.total'),
		contributorRows: (scope) =>
			(scope ?? page).getByTestId('top-contributors-row'),
		contributorCount: (row) => row.getByTestId('top-contributors-row-count'),
		contributorBar: (row) => row.getByRole('progressbar'),

		rows: () => page.getByTestId('timeline-row'),
		footerRange: () => page.getByTestId('timeline-footer-range'),
		statsCard: (title) =>
			page.locator(`[data-testid="stats-card"][data-stats-title="${title}"]`),

		rowLabels: () => history.rowCell(history.rows(), 'labels').allInnerTexts(),

		firstRowCreatedAt: () =>
			history.rowCell(history.rows().first(), 'created-at').innerText(),

		openRowActions: async (index) => {
			await history.rowCell(history.rows().nth(index), 'actions').click();
		},

		/**
		 * Both the list and the timeline use nuqs with
		 * `parseAsInteger.withDefault(1)`, which **removes** the param on reset
		 * rather than writing `page=1`, so "absent" and "1" are the same state and a
		 * naive `?page=1` regex never matches.
		 */
		expectFirstPage: async () => {
			await expect
				.poll(() => new URL(page.url()).searchParams.get('page') ?? '1')
				.toBe('1');
		},

		fetchTimeline: historyApi,

		readTotal: async (ruleId) => (await historyApi(ruleId, { limit: 1 })).total,

		/**
		 * Poll until `min` rows in `state` exist. ~20-35 s for the logs seed and
		 * ~10 s for metrics, so budget generously: a timeout here means the marker
		 * aged out of the eval window, not that the assertion is wrong.
		 */
		waitForEntries: async (
			ruleId,
			{ min, state = 'firing', timeoutMs = WAIT_TIMELINE_ENTRIES_DEFAULT },
		) => {
			const deadline = Date.now() + timeoutMs;
			let last: TimelineResponse = { items: [], total: 0 };
			while (Date.now() < deadline) {
				// eslint-disable-next-line no-await-in-loop
				last = await historyApi(ruleId);
				if (last.items.filter((item) => item.state === state).length >= min) {
					return last;
				}
				// eslint-disable-next-line no-await-in-loop
				await new Promise((resolve) => {
					setTimeout(resolve, 2_000);
				});
			}
			throw new Error(
				`timeline for rule ${ruleId} never reached ${min} '${state}' rows within ${timeoutMs}ms ` +
					`(last: total=${last.total}, states=${JSON.stringify(countStates(last.items))})`,
			);
		},

		waitForStates: async (
			ruleId,
			{ states, timeoutMs = WAIT_TIMELINE_STATES_DEFAULT },
		) => {
			const deadline = Date.now() + timeoutMs;
			let last: TimelineResponse = { items: [], total: 0 };
			while (Date.now() < deadline) {
				// eslint-disable-next-line no-await-in-loop
				last = await historyApi(ruleId);
				const seen = countStates(last.items);
				if (
					Object.entries(states).every(([state, min]) => (seen[state] ?? 0) >= min)
				) {
					return last;
				}
				// eslint-disable-next-line no-await-in-loop
				await new Promise((resolve) => {
					setTimeout(resolve, 3_000);
				});
			}
			throw new Error(
				`timeline for rule ${ruleId} never reached ${JSON.stringify(states)} within ${timeoutMs}ms ` +
					`(last states: ${JSON.stringify(countStates(last.items))})`,
			);
		},

		isRequest: (request, endpoint) =>
			new RegExp(`/api/v2/rules/[^/]+/history/${endpoint}`).test(request.url()),

		/**
		 * `filterExpression` matters whenever a scenario reacts to *its own*
		 * request: the page's own load is still in flight when the spec starts
		 * typing, so an unqualified matcher resolves with that earlier response.
		 */
		waitForResponse: (endpoint, options) =>
			page.waitForResponse((res) => {
				if (!history.isRequest(res.request(), endpoint)) {
					return false;
				}
				if (options?.status !== undefined && res.status() !== options.status) {
					return false;
				}
				if (options?.filterExpression !== undefined) {
					const sent =
						new URL(res.request().url()).searchParams.get('filterExpression') ?? '';
					return sent === options.filterExpression;
				}
				return true;
			}),

		typeFilter: async (expression) => {
			const editor = history.filterEditor().first();
			await editor.waitFor({ state: 'visible', timeout: 15_000 });
			// Retried: a keystroke landing while the editor is still syncing its
			// initial value moves the cursor, so the text comes out rotated. An
			// unterminated quote or bracket is auto-closed by the editor.
			await expect(async () => {
				await editor.click();
				await page.keyboard.press('ControlOrMeta+a');
				await page.keyboard.press('Delete');
				await page.keyboard.type(expression);
				if (expression === '') {
					await expect(editor.locator('.cm-placeholder')).toBeVisible({
						timeout: 2_000,
					});
				} else {
					const escaped = expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					await expect(editor).toHaveText(new RegExp(`^${escaped}['")\\]]?$`), {
						timeout: 2_000,
					});
				}
			}).toPass({ timeout: 15_000 });
		},

		runFilter: async (expression) => {
			await history.typeFilter(expression);
			await history.runQueryButton().click();
		},

		/**
		 * The antd table is *uncontrolled* — `sorter: true` with no `sortOrder` — so
		 * its cycle is none → ascend → descend regardless of the order the hook
		 * already sends. Reaching `desc` takes two clicks, and the first only resets
		 * the page, because asc is nuqs's default and writes no param.
		 */
		sortDescending: async () => {
			const header = page.getByRole('columnheader', { name: 'STATE' });
			const descRequest = page.waitForRequest(
				(req) =>
					history.isRequest(req, 'timeline') &&
					new URL(req.url()).searchParams.get('order') === 'desc',
			);
			await header.click();
			await header.click();
			await descRequest;
		},

		/** Mirror of `encodeCursor` in `useTimelineTableCursor.ts`. */
		cursorFor: (pageNumber, limit = TIMELINE_PAGE_SIZE) => {
			if (pageNumber <= 1) {
				return undefined;
			}
			return Buffer.from(
				JSON.stringify({ offset: (pageNumber - 1) * limit, limit }),
			)
				.toString('base64')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '');
		},

		labelsOf: (item) =>
			(item.labels ?? []).reduce<Record<string, string>>((acc, label) => {
				const name = label.key?.name;
				if (name) {
					acc[name] = String(label.value ?? '');
				}
				return acc;
			}, {}),
	};

	return {
		seed,
		antd,
		shell,
		channels,
		list,
		form,
		details,
		history,
		downtime: plannedDowntimeDriver(page),
		routing: routingPoliciesDriver(page),
	};
}

export const withAlerts: Layer<{ alerts: Alerts }> = driver(
	'alerts',
	({ page }) => alertsDriver(page),
);
