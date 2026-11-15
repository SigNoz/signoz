/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	blurFilter,
	findSuggestion,
	openKeySuggestions,
	showFilterErrors,
	typeFilter,
	typeFilterWithCaretBack,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/stories/__story_mockdata__/querySearch.play';
import { QuickFilterManagePermissions } from 'lib/authz/hooks/useAuthZ/permissions/quick-filter.permissions';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { grantsAll } from '@/storybook/access/access';

import type { LogsArgs } from '../LogsModulePage.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: LogsArgs;
}

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const VALUE_SUGGESTIONS = {
	loaded: 'checkout',
	loading: 'Loading suggestions',
	error: 'Error loading suggestions',
} satisfies Record<LogsArgs['filterValues'], string>;

/** The rows a play opens exist only in the list view's table format. */
const listsLogRows = (args: LogsArgs, count = 1): boolean =>
	args.view === 'list' &&
	args.format === 'table' &&
	args.dataState === 'loaded' &&
	args.logs >= count;

/** The settings control stays enabled when the check itself fails. */
const canManageQuickFilters = (args: LogsArgs): boolean =>
	args.filtersPanel &&
	(args.authzState === 'error' ||
		grantsAll(args, ...QuickFilterManagePermissions));

/** Runs `drive` once the filter has its keys, which come with the page's data. */
const onFilter =
	(drive: (canvasElement: HTMLElement, args: LogsArgs) => Promise<void>) =>
	async ({ canvasElement, args }: PlayContext): Promise<void> => {
		if (args.dataState === 'loaded') {
			await drive(canvasElement, args);
		}
	};

/** Opening a log is what the drawer is for, and the first row will do. */
const openFirstLog = async (canvasElement: HTMLElement): Promise<void> => {
	const [row] = await within(canvasElement).findAllByTestId(
		/^logs-table-row-/,
		undefined,
		untilLoaded,
	);

	// The list hangs its click handler off the cells rather than the row, so a
	// click on the row itself opens nothing.
	const [, timestamp] = within(row).getAllByRole('cell');

	await userEvent.click(timestamp);
	await screen.findByTestId('log-detail-drawer', undefined, untilLoaded);
};

const openLogMenuItem = async (
	canvasElement: HTMLElement,
	item: string,
): Promise<void> => {
	await openFirstLog(canvasElement);
	await userEvent.click(await screen.findByTestId('log-details-header-menu'));
	await userEvent.click(await screen.findByText(item));
	await waitFor(() =>
		expect(screen.getByText('Copied to clipboard')).toBeVisible(),
	);
};

export const openLogDetails = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsLogRows(args)) {
		return;
	}

	await openFirstLog(canvasElement);
};

export const openLogContext = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsLogRows(args)) {
		return;
	}

	await openFirstLog(canvasElement);
	await userEvent.click(
		await screen.findByText('Context', undefined, untilLoaded),
	);
	// The tab queries the logs either side before it can render them.
	await screen.findAllByText(/cache lookup for cart/, undefined, untilLoaded);
};

export const openLogDetailsMenu = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsLogRows(args)) {
		return;
	}

	await openFirstLog(canvasElement);
	await userEvent.click(await screen.findByTestId('log-details-header-menu'));
	await screen.findByText('Copy link to log');
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

export const stepToNextLog = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsLogRows(args, 2)) {
		return;
	}

	await openFirstLog(canvasElement);
	await userEvent.click(
		await screen.findByTestId('log-details-header-next', undefined, untilLoaded),
	);
};

export const suggestFilterKeys = onFilter((canvasElement) =>
	openKeySuggestions(canvasElement, 'severity_text'),
);

export const suggestPartialKey = onFilter(async (canvasElement) => {
	await typeFilter(canvasElement, 'serv');
	await findSuggestion(canvasElement, 'service.name');
});

export const suggestOperators = onFilter(async (canvasElement) => {
	await typeFilter(canvasElement, 'service.name ');
	await findSuggestion(canvasElement, 'CONTAINS');
});

export const suggestNumberOperators = onFilter(async (canvasElement) => {
	await typeFilter(canvasElement, 'http.status_code ');
	await findSuggestion(canvasElement, 'BETWEEN');
});

export const suggestNegatedOperators = onFilter(async (canvasElement) => {
	await typeFilter(canvasElement, 'service.name NOT ');
	await findSuggestion(canvasElement, 'IN');
});

export const suggestFilterValues = onFilter(async (canvasElement, args) => {
	await typeFilter(canvasElement, 'service.name = ');
	await findSuggestion(canvasElement, VALUE_SUGGESTIONS[args.filterValues]);
});

export const suggestNoValues = onFilter(async (canvasElement, args) => {
	if (args.filterValues !== 'loaded') {
		return;
	}

	await typeFilter(canvasElement, 'body = ');
	await findSuggestion(canvasElement, 'No suggestions available');
});

export const suggestInListValues = onFilter(async (canvasElement, args) => {
	if (args.filterValues !== 'loaded') {
		return;
	}

	await typeFilterWithCaretBack(
		canvasElement,
		"service.name IN ['auth', ]",
		1,
		'checkout',
	);
});

export const suggestConjunctions = onFilter(async (canvasElement) => {
	await typeFilter(canvasElement, "service.name = 'checkout' ");
	await findSuggestion(canvasElement, 'OR');
});

export const suggestInNestedGroup = onFilter((canvasElement) =>
	typeFilterWithCaretBack(canvasElement, '()', 1, 'NOT'),
);

export const completeFilter = onFilter(async (canvasElement) => {
	await typeFilter(
		canvasElement,
		"service.name IN ['checkout', 'payments'] AND severity_text = 'ERROR' AND http.status_code >= 500 AND body CONTAINS 'timeout'",
	);
	await blurFilter(canvasElement);
});

export const showFilterSyntaxError = onFilter((canvasElement) =>
	showFilterErrors(canvasElement, 'service.name = '),
);

export const suggestRecentSearches = onFilter(async (canvasElement, args) => {
	if (args.recentFilters === 0) {
		return;
	}

	await openKeySuggestions(
		canvasElement,
		"k8s.namespace.name = 'observability'",
	);
});

export const copyLogLinkFromRow = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsLogRows(args)) {
		return;
	}

	const [row] = await within(canvasElement).findAllByTestId(
		/^logs-table-row-/,
		undefined,
		untilLoaded,
	);
	const [, timestamp] = within(row).getAllByRole('cell');

	await userEvent.hover(timestamp);
	await userEvent.click(
		await waitFor(() => {
			const button = canvasElement.querySelector<HTMLElement>('.copy-log-btn');

			if (!button) {
				throw new Error('Row actions did not render');
			}

			return button;
		}, untilLoaded),
	);
	await waitFor(() =>
		expect(screen.getByText('Copied to clipboard')).toBeVisible(),
	);
};

export const copyLog = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsLogRows(args)) {
		return;
	}

	await openLogMenuItem(canvasElement, 'Copy log');
};

export const copyLogDetailsLink = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsLogRows(args)) {
		return;
	}

	await openLogMenuItem(canvasElement, 'Copy link to log');
};
