/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	findSuggestion,
	openKeySuggestions,
	showFilterErrors,
	typeFilter,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/stories/__story_mockdata__/querySearch.play';
import { QuickFilterManagePermissions } from 'lib/authz/hooks/useAuthZ/permissions/quick-filter.permissions';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { grantsAll } from '@/storybook/access/access';

import type { TracesArgs } from '../TracesModulePage.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: TracesArgs;
}

/** The page fetches before it renders its filters, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const LIST_PAGE_SIZE = 100;

const TRACE_PAGE_SIZE = 20;

const showsFilter = (args: TracesArgs): boolean =>
	args.dataState === 'loaded' && args.tab !== 'funnels';

const showsView = (args: TracesArgs, view: ExplorerViews): boolean =>
	args.tab === 'explorer' && args.view === view && args.dataState === 'loaded';

/** The settings control stays enabled when the check itself fails. */
const canManageQuickFilters = (args: TracesArgs): boolean =>
	args.tab === 'explorer' &&
	(args.authzState === 'error' ||
		grantsAll(args, ...QuickFilterManagePermissions));

export const showRootSpansNextPage = async ({
	args,
}: PlayContext): Promise<void> => {
	// The pager offers page 3 once page 2 comes back full.
	if (
		!showsView(args, ExplorerViews.TRACE) ||
		args.spans < 2 * TRACE_PAGE_SIZE
	) {
		return;
	}

	await userEvent.click(
		await screen.findByRole('button', { name: 'Go to next page' }, untilLoaded),
	);
	const pager = screen.getByLabelText('pagination');

	await expect(
		await within(pager).findByText('3', undefined, untilLoaded),
	).toBeVisible();
};

export const loadNextListPage = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsView(args, ExplorerViews.LIST) || args.spans <= LIST_PAGE_SIZE) {
		return;
	}

	// Scrolls again on every attempt, since each loaded page moves the end.
	await waitFor(async (): Promise<void> => {
		const scroller = canvasElement.querySelector<HTMLElement>(
			'[data-virtuoso-scroller]',
		);

		await expect(scroller).not.toBeNull();
		(scroller as HTMLElement).scrollTop = (scroller as HTMLElement).scrollHeight;
		const indexes = Array.from(
			canvasElement.querySelectorAll<HTMLElement>('tr[data-index]'),
			(row) => Number(row.dataset.index),
		);

		await expect(Math.max(...indexes)).toBeGreaterThanOrEqual(LIST_PAGE_SIZE);
	}, untilLoaded);
};

export const openQuickFiltersSettings = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!canManageQuickFilters(args)) {
		return;
	}

	// The settings control renders disabled while its permission check is in
	// flight and is swapped for the enabled one once the check answers, so it is
	// looked up again on every attempt; a click on the disabled one is dropped in
	// silence.
	const control = await waitFor(async () => {
		const settings = screen.getByTestId('settings-icon-container');

		await expect(settings).not.toHaveAttribute('aria-disabled', 'true');

		return settings;
	}, untilLoaded);

	await userEvent.click(control);
	await screen.findByText('Edit quick filters');
};

export const dirtyQuickFiltersSettings = async (
	context: PlayContext,
): Promise<void> => {
	const { args } = context;
	if (
		!canManageQuickFilters(args) ||
		args.dataState !== 'loaded' ||
		args.quickFilters === 0
	) {
		return;
	}

	await openQuickFiltersSettings(context);
	// One Remove per added filter; the first row's is the one clicked.
	const [removeFilter] = await screen.findAllByRole('button', {
		name: 'Remove',
	});

	await userEvent.click(removeFilter);
	await screen.findByRole('button', { name: 'Save changes' });
};

export const suggestFilterKeys = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsFilter(args)) {
		return;
	}

	await openKeySuggestions(canvasElement, 'status_code_string');
};

export const suggestResourceKeys = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsFilter(args)) {
		return;
	}

	await typeFilter(canvasElement, 'resource.');
	await findSuggestion(canvasElement, 'resource.service.name');
};

export const suggestFilterValues = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsFilter(args)) {
		return;
	}

	await typeFilter(canvasElement, 'service.name = ');
	await findSuggestion(canvasElement, 'checkout');
};

export const suggestBooleanValues = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsFilter(args)) {
		return;
	}

	await typeFilter(canvasElement, 'has_error = ');
	await findSuggestion(canvasElement, 'false');
};

export const showFilterSyntaxError = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsFilter(args)) {
		return;
	}

	await showFilterErrors(canvasElement, 'has_error = true AND');
};

export const openCreateFunnel = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.tab !== 'funnels') {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: /new funnel/i },
			untilLoaded,
		),
	);
	await screen.findByRole('dialog', { name: /create new funnel/i });
};

/** Row actions exist only once the list holds a funnel. */
export const openRenameFunnel = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.tab !== 'funnels' || args.funnels === 0) {
		return;
	}

	const action = await waitFor(() => {
		const found = canvasElement.querySelector<HTMLElement>(
			'.funnel-item__action-icon',
		);

		if (!found) {
			throw new Error('Funnel row actions are not rendered');
		}

		return found;
	}, untilLoaded);

	await userEvent.click(action);
	await userEvent.click(await screen.findByRole('button', { name: 'Rename' }));
	await screen.findByRole('dialog', { name: /rename funnel/i });
};
