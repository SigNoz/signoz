/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	buildSavedViewDeletePermission,
	buildSavedViewReadPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { grantsAll } from '@/storybook/access/access';

import {
	byTestId,
	expectDisabled,
	expectPending,
	findRows,
	hoverRow,
	listsViews,
	openRowMenu,
	openSaveChangesMenu,
	rowMenuItem,
	type SavedViewsArgs,
	UNTIL_LOADED,
} from '../SavedViews.stories.mocks';
import { OPEN_VIEW_ERRORS, unreadableViewId, WRITE_ERRORS } from './savedViews';

interface PlayContext {
	canvasElement: HTMLElement;
	args: SavedViewsArgs;
}

const DELETE_TOAST = {
	success: 'View deleted',
	error: WRITE_ERRORS.delete.error.message,
} as const;

const firstRow = async (canvasElement: HTMLElement): Promise<HTMLElement> => {
	const [row] = await findRows(canvasElement);

	return row;
};

const viewIdOf = (row: HTMLElement): string =>
	row.getAttribute('data-view-id') ?? '';

const expectToast = (text: string): Promise<void> =>
	waitFor(
		async () => expect(screen.getByText(text)).toBeVisible(),
		UNTIL_LOADED,
	);

export const openFirstRowMenu = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsViews(args)) {
		return;
	}

	await openRowMenu(await firstRow(canvasElement));
};

/** The ✓ menu exists only while the open view loads and differs from the url. */
export const showSaveChangesMenu = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.openView !== 'unsaved-changes' ||
		args.dataState !== 'loaded' ||
		args.authzState !== 'loaded' ||
		args.viewPending
	) {
		return;
	}

	await openSaveChangesMenu(canvasElement);
};

/**
 * The hover card shows the query only when the view loads and its read is
 * granted; otherwise it holds the skeleton, the error or the permission callout.
 */
export const hoverFirstRowQuery = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsViews(args) || args.viewPending || OPEN_VIEW_ERRORS[args.openView]) {
		return;
	}

	const row = await firstRow(canvasElement);
	const id = viewIdOf(row);

	if (
		(args.unreadableView && id === unreadableViewId(args.source)) ||
		!grantsAll(args, buildSavedViewReadPermission(id))
	) {
		return;
	}

	const card = await hoverRow(row);
	const query = await within(card).findByTestId(
		'saved-view-hover-card-query',
		undefined,
		UNTIL_LOADED,
	);

	const expected = {
		filtered: [],
		'no-filters': ['No filters'],
		'multi-query': ['A', 'B'],
	}[args.viewQueries];

	await waitFor(async () => {
		for (const text of expected) {
			await expect(within(query).getByText(text)).toBeVisible();
		}
	}, UNTIL_LOADED);
};

export const copyFirstViewLink = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsViews(args)) {
		return;
	}

	const row = await firstRow(canvasElement);

	await openRowMenu(row);
	await userEvent.click(rowMenuItem('copyLink')());
	await userEvent.unhover(row);
	await expectToast('Link copied');
};

/**
 * Confirms the first view's delete. The Writes control decides the outcome: a
 * toast for success or failure, the confirm button spinning while it never
 * answers.
 */
export const deleteFirstView = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsViews(args)) {
		return;
	}

	const row = await firstRow(canvasElement);

	if (!grantsAll(args, buildSavedViewDeletePermission(viewIdOf(row)))) {
		return;
	}

	await openRowMenu(row);
	await expectDisabled(rowMenuItem('delete'), false);
	await userEvent.click(rowMenuItem('delete')());
	await userEvent.click(
		await screen.findByTestId(
			'delete-saved-view-confirm',
			undefined,
			UNTIL_LOADED,
		),
	);

	if (args.writes === 'loading') {
		await expectPending(byTestId('delete-saved-view-confirm'));
		return;
	}

	await expectToast(DELETE_TOAST[args.writes]);

	if (args.writes === 'error') {
		await expect(screen.getByTestId('delete-saved-view-confirm')).toBeVisible();
	}
};
