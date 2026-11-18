/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest, type RequestHandler } from 'msw';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import remove from 'api/browser/localstorage/remove';
import {
	type AuthtypesTransactionDTO,
	type SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
	type SavedviewtypesUpdatableSavedViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SIDEBAR_TOOLTIP_DELAY_MS } from 'components/QuickFilters/QuickFiltersLayout/constants';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
} from 'lib/authz/utils/authz-test-utils';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { accessFor } from '@/storybook/access/access';
import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockControlValues, StoryMocks } from '@/storybook/controls/types';
import { withCanvas } from '@/storybook/decorators/withCanvas';
import { authzMocks, type AuthzArgs } from '@/storybook/globals/authzMocks';
import { respondWith } from '@/storybook/runtime/responseState';

import {
	createdSavedView,
	OPEN_VIEW_ERRORS,
	OPEN_VIEWS,
	type OpenView,
	SAVED_VIEW_SOURCES,
	SAVED_VIEWS_MAX,
	savedViewById,
	savedViewResponse,
	savedViewRoute,
	savedViewsListResponse,
	type SavedViewSource,
	unreadableViewId,
	withLongName,
} from './__story_mockdata__/savedViews';

import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsPanel from '../SavedViewsPanel';
import type { SavedViewRowActionKey } from '../types';

const API = 'http://localhost/api/v2/saved_views';

const LIST = 'Saved Views · list';
const VIEW = 'Saved Views · open view';

const controls = {
	source: choiceControl<SavedViewSource>('Source', {
		group: VIEW,
		description: 'Which explorer the views belong to.',
		options: SAVED_VIEW_SOURCES,
		value: SavedviewtypesSourceDTO.traces,
	}),
	openView: choiceControl<OpenView>('Open view', {
		group: VIEW,
		description:
			'The `viewKey` the explorer url carries. `unsaved-changes` stages a query that differs from the view, which swaps in the ✓ save menu; `forbidden`, `failed` and `not-found` are the 403, 500 and 404 the view fetch answers with; each shows View failed to load.',
		options: OPEN_VIEWS,
		value: 'none',
	}),
	unreadableView: toggleControl('Unreadable view', {
		group: VIEW,
		description:
			'Denies `read` on the first view created by others, and so on `saved-view:*`, on top of the Access controls: its row still opens it, and the header then shows No view access, as with Open view on `created-by-others`. Its hover card shows the permission callout in place of the query.',
		value: false,
	}),
	viewPending: toggleControl('View fetch pending', {
		group: VIEW,
		description:
			'Holds every `GET /saved_views/:id` open, so a hover card stays on its loading skeleton.',
		value: false,
	}),
	createdByMe: countControl('Created by me', {
		group: LIST,
		value: 3,
		max: SAVED_VIEWS_MAX,
	}),
	createdByOthers: countControl('Created by others', {
		group: LIST,
		description: 'Both at 0 is the empty state, with its Create view button.',
		value: 4,
		max: SAVED_VIEWS_MAX,
	}),
	longNames: toggleControl('Long names', {
		group: LIST,
		description:
			'Lengthens every view name past the sidebar width, so rows and the open view name truncate.',
		value: false,
	}),
};

type SavedViewsValues = MockControlValues<typeof controls>;

type WrittenView = Pick<SavedviewtypesSavedViewDTO, 'spec' | 'source'>;

const viewDenied = (
	transaction: AuthtypesTransactionDTO,
	deniedId: string,
): boolean =>
	transaction.relation === 'read' &&
	transaction.object.resource.kind === 'saved-view' &&
	[deniedId, '*'].includes(transaction.object.selector);

const definition = defineStoryMocks({
	controls,
	handlers: (
		values: SavedViewsValues & AuthzArgs,
		response,
	): RequestHandler[] => {
		const {
			source,
			openView,
			viewPending,
			createdByMe,
			createdByOthers,
			longNames,
		} = values;

		// What the panel writes stays in this handler set until a control changes.
		const created: SavedviewtypesSavedViewDTO[] = [];
		const updated = new Map<string, WrittenView>();
		const deleted = new Set<string>();

		const current = (
			view: SavedviewtypesSavedViewDTO,
		): SavedviewtypesSavedViewDTO => ({ ...view, ...updated.get(view.id) });

		const named = (
			view: SavedviewtypesSavedViewDTO,
		): SavedviewtypesSavedViewDTO => (longNames ? withLongName(view) : view);

		const findView = (id: string): SavedviewtypesSavedViewDTO | undefined => {
			const stored = savedViewById(id);
			const view =
				created.find((item) => item.id === id) ?? (stored && named(stored));

			return view && !deleted.has(id) ? current(view) : undefined;
		};

		const openError = OPEN_VIEW_ERRORS[openView];

		return [
			rest.post(API, async (req, res, ctx) => {
				const body = (await req.json()) as SavedviewtypesUpdatableSavedViewDTO;
				const id = `storybook-${source}-created-${created.length + 1}`;

				created.push(createdSavedView(source, id, body.spec));

				return res(ctx.status(201), ctx.json({ status: 'success', data: { id } }));
			}),

			rest.get(
				API,
				response.json(() => {
					const list = savedViewsListResponse(source, createdByMe, createdByOthers);

					return {
						...list,
						data: [...(list.data ?? []).map(named), ...created]
							.filter((view) => !deleted.has(view.id))
							.map(current),
					};
				}),
			),

			rest.get(`${API}/:id`, (req, res, ctx) => {
				if (viewPending) {
					return res(ctx.delay('infinite'));
				}

				if (openError) {
					return res(ctx.status(openError.status), ctx.json(openError.body));
				}

				const view = findView(String(req.params.id));

				if (!view) {
					return res(ctx.status(404), ctx.json(OPEN_VIEW_ERRORS['not-found']?.body));
				}

				return response.json(() => savedViewResponse(view))(req, res, ctx);
			}),

			rest.put(`${API}/:id`, async (req, res, ctx) => {
				const body = (await req.json()) as SavedviewtypesUpdatableSavedViewDTO;

				updated.set(String(req.params.id), {
					spec: body.spec,
					source: body.source,
				});

				return res(ctx.status(204));
			}),

			rest.delete(`${API}/:id`, (req, res, ctx) => {
				deleted.add(String(req.params.id));

				return res(ctx.status(204));
			}),

			...(values.unreadableView
				? [
						rest.post(
							AUTHZ_CHECK_URL,
							respondWith(values.authzState, async (req) => {
								const payload = (await req.json()) as AuthtypesTransactionDTO[];
								const granted = accessFor(
									values.access,
									values.permissions,
									values.revoked,
								);
								const deniedId = unreadableViewId(source);

								return authzMockResponse(
									payload,
									payload.map(
										(transaction) =>
											!viewDenied(transaction, deniedId) && granted.allows(transaction),
									),
								);
							}),
						),
					]
				: []),
		];
	},
	config: ({ source, openView }) => ({
		route: savedViewRoute(source, openView),
	}),
	effect: () => {
		remove(LOCALSTORAGE.LAST_USED_SAVED_VIEWS);
	},
});

/**
 * The per-view read denial answers `authz/check` in place of the global access
 * mocks, so it reads their controls as well as its own to answer every other
 * check the way they would.
 */
export const savedViewsMocks: StoryMocks<typeof controls> = {
	...definition,
	read: (args) => ({ ...authzMocks.read(args), ...definition.read(args) }),
};

/** The sidebar slot of an explorer without quick filters. */
export const sidebarCanvas = withCanvas({
	width: 280,
	height: 640,
	padding: 0,
	display: 'flex',
	flexDirection: 'column',
	borderRight: '1px solid var(--l1-border)',
});

/**
 * The header above the pinned list. `onOpenViews` adds All views, which the
 * header only shows in an explorer whose quick filters hide the list.
 */
export function SavedViewsSidebar({
	source,
	onOpenViews,
}: {
	source: SavedViewSource;
	onOpenViews?: () => void;
}): JSX.Element {
	return (
		<TooltipProvider delay={SIDEBAR_TOOLTIP_DELAY_MS}>
			<SavedViewsHeader source={source} onOpenViews={onOpenViews} />
			<SavedViewsPanel source={source} />
		</TooltipProvider>
	);
}

/** The panel fetches the list and checks every row's permissions before it settles. */
export const UNTIL_LOADED = { timeout: 15_000 };

/**
 * Re-queried on every attempt: a button whose check settles is a new node, so a
 * reference taken while it was pending never changes.
 */
type FindElement = () => HTMLElement;

export const byTestId =
	(testId: string): FindElement =>
	(): HTMLElement =>
		screen.getByTestId(testId);

/** A check still in flight: `aria-busy` on a button, `data-loading` on a menu row. */
const isPending = (element: HTMLElement): boolean =>
	element.getAttribute('aria-busy') === 'true' ||
	element.hasAttribute('data-loading');

const isDisabled = (element: HTMLElement): boolean =>
	element.hasAttribute('disabled') ||
	element.hasAttribute('data-disabled') ||
	element.getAttribute('aria-disabled') === 'true';

export const expectDisabled = (
	find: FindElement,
	disabled = true,
): Promise<void> =>
	waitFor(async () => {
		const element = find();

		await expect(isPending(element)).toBe(false);
		await expect(isDisabled(element)).toBe(disabled);
	}, UNTIL_LOADED);

export const expectPending = (find: FindElement): Promise<void> =>
	waitFor(() => expect(isPending(find())).toBe(true), UNTIL_LOADED);

export const findRows = (canvasElement: HTMLElement): Promise<HTMLElement[]> =>
	within(canvasElement).findAllByTestId(
		'saved-views-row',
		undefined,
		UNTIL_LOADED,
	);

export const rowName =
	(row: HTMLElement): FindElement =>
	(): HTMLElement =>
		within(row).getByTestId('saved-views-row-name');

const hoverRow = async (row: HTMLElement): Promise<HTMLElement> => {
	await userEvent.hover(row);

	return screen.findByTestId('saved-view-hover-card', undefined, UNTIL_LOADED);
};

const searchViews = async (
	canvasElement: HTMLElement,
	text: string,
): Promise<void> => {
	const search = await within(canvasElement).findByTestId(
		'saved-views-search',
		undefined,
		UNTIL_LOADED,
	);

	await userEvent.type(search, text);
};

const clickWhenEnabled = async (find: FindElement): Promise<void> => {
	await expectDisabled(find, false);
	await userEvent.click(find());
};

export const openRowMenu = async (row: HTMLElement): Promise<void> => {
	await userEvent.click(within(row).getByTestId('saved-views-row-menu'));
	await screen.findByRole('menu', undefined, UNTIL_LOADED);
};

export const rowMenuItem = (key: SavedViewRowActionKey): FindElement =>
	byTestId(`saved-views-row-menu-item-${key}`);

export const openSaveChangesMenu = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	const trigger = await waitFor(async () => {
		const button = within(canvasElement).getByTestId('saved-views-save-changes');

		await expect(button).not.toHaveAttribute('aria-busy');

		return button;
	}, UNTIL_LOADED);

	await userEvent.click(trigger);
	await screen.findByRole('menu', undefined, UNTIL_LOADED);
};

export const saveChangesItem = (key: 'save-as-new' | 'update'): FindElement =>
	byTestId(`saved-views-save-changes-item-${key}`);

type PlayContext = {
	canvasElement: HTMLElement;
	args: { source: SavedViewSource };
};

export const hoverFirstRow = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [row] = await findRows(canvasElement);
	const card = await hoverRow(row);

	await within(card).findByTestId(
		'saved-view-hover-card-query',
		undefined,
		UNTIL_LOADED,
	);
};

export const hoverFirstRowLoading = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [row] = await findRows(canvasElement);
	const card = await hoverRow(row);

	await within(card).findByTestId(
		'saved-view-hover-card-loading',
		undefined,
		UNTIL_LOADED,
	);
};

export const searchWithNoResults = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await searchViews(canvasElement, 'nothing like this');
	await screen.findByTestId('saved-views-list-no-results');
};

export const openCreateModal = async (): Promise<void> => {
	await clickWhenEnabled(byTestId('saved-views-create'));
	await screen.findByTestId('save-view-modal');
};

export const openEditDetailsModal = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [row] = await findRows(canvasElement);

	await openRowMenu(row);
	await clickWhenEnabled(rowMenuItem('editDetails'));
	await screen.findByTestId('save-view-modal');
};

export const openSaveAsNewModal = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openSaveChangesMenu(canvasElement);
	await clickWhenEnabled(saveChangesItem('save-as-new'));
	await screen.findByTestId('save-view-modal');
};

export const openDeleteDialog = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [row] = await findRows(canvasElement);

	await openRowMenu(row);
	await clickWhenEnabled(rowMenuItem('delete'));
	await screen.findByTestId('delete-saved-view-confirm');
};

const findUnreadableRow = async ({
	canvasElement,
	args,
}: PlayContext): Promise<HTMLElement> => {
	const rows = await findRows(canvasElement);
	const deniedId = unreadableViewId(args.source);

	return rows.find(
		(row) => row.getAttribute('data-view-id') === deniedId,
	) as HTMLElement;
};

export const hoverUnreadableRow = async (
	context: PlayContext,
): Promise<void> => {
	const card = await hoverRow(await findUnreadableRow(context));

	await expect(
		await within(card).findByText(/not authorized/i, undefined, UNTIL_LOADED),
	).toBeVisible();
	await expect(
		within(card).queryByTestId('saved-view-hover-card-query'),
	).toBeNull();
};

export const openUnreadableView = async (
	context: PlayContext,
): Promise<void> => {
	const { canvasElement } = context;
	const denied = await findUnreadableRow(context);

	await userEvent.click(rowName(denied)());
	await expect(
		await within(canvasElement).findByText(
			'No view access',
			undefined,
			UNTIL_LOADED,
		),
	).toBeVisible();
};
