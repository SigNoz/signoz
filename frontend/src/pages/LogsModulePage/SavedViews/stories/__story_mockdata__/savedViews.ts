/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { explorerView } from 'mocks-server/__mockdata__/explorer_views';
import type { AllViewsProps, ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';

const VIEWS: { name: string; color: string; createdBy: string }[] = [
	{ name: 'Checkout errors', color: '#f2536b', createdBy: 'ada@signoz.io' },
	{
		name: 'Auth service warnings',
		color: '#ffbe0b',
		createdBy: 'ada@signoz.io',
	},
	{
		name: 'Slow SQL statements',
		color: '#00ffd0',
		createdBy: 'grace@signoz.io',
	},
	{ name: 'Payment webhooks', color: '#7c4dff', createdBy: 'grace@signoz.io' },
	{
		name: 'Rate limited requests',
		color: '#4e74f8',
		createdBy: 'alan@signoz.io',
	},
	{ name: 'Cron job failures', color: '#ff7d3b', createdBy: 'alan@signoz.io' },
	{ name: 'Cold start traces', color: '#189e5f', createdBy: 'alan@signoz.io' },
	{ name: 'Kafka consumer lag', color: '#c7c7c7', createdBy: 'ada@signoz.io' },
];

export const SAVED_VIEW_MAX = VIEWS.length;

/** The table paginates past this, which is the only place page 2 shows up. */
export const SAVED_VIEWS_PAGE_SIZE = 5;

/** The jest fixture is the shape of a view; only what the list shows changes. */
const [baseView] = explorerView.data as unknown as ViewProps[];

export const logsSavedViewsResponse = (count: number): AllViewsProps => ({
	status: 'success',
	data: VIEWS.slice(0, count).map(({ name, color, createdBy }, index) => ({
		...baseView,
		id: `storybook-logs-view-${index + 1}`,
		name,
		sourcePage: DataSource.LOGS,
		tags: ['logs'],
		createdBy,
		createdAt: `2026-08-${String(4 + index).padStart(2, '0')}T09:24:11.000Z`,
		extraData: JSON.stringify({ color }),
	})),
});

/**
 * Renaming and deleting answer, so the modal closes and the notification is the
 * one the page shows on success. The list itself is what the `Saved views`
 * control says it is, so the refetch reads it back unchanged: see the PR.
 */
export const savedViewWriteResponse = (): { status: string } => ({
	status: 'success',
});
