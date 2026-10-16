/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest, type RequestHandler } from 'msw';
import remove from 'api/browser/localstorage/remove';
import {
	type AuthtypesTransactionDTO,
	type SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
	type SavedviewtypesUpdatableSavedViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
} from 'lib/authz/utils/authz-test-utils';

import { accessFor } from '@/storybook/access/access';
import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockControlValues, StoryMocks } from '@/storybook/controls/types';
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
} from './__story_mockdata__/savedViews';

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
			'Denies `read` on the first view created by others alone, on top of the Access controls: its row greys out, and with Open view on `created-by-others` the header shows No view access.',
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
};

type SavedViewsValues = MockControlValues<typeof controls>;

type WrittenView = Pick<SavedviewtypesSavedViewDTO, 'spec' | 'source'>;

const viewDenied = (
	transaction: AuthtypesTransactionDTO,
	deniedId: string,
): boolean =>
	transaction.relation === 'read' &&
	transaction.object.resource.kind === 'saved-view' &&
	transaction.object.selector === deniedId;

const definition = defineStoryMocks({
	controls,
	handlers: (
		values: SavedViewsValues & AuthzArgs,
		response,
	): RequestHandler[] => {
		const { source, openView, createdByMe, createdByOthers } = values;

		// What the panel writes stays in this handler set until a control changes.
		const created: SavedviewtypesSavedViewDTO[] = [];
		const updated = new Map<string, WrittenView>();
		const deleted = new Set<string>();

		const current = (
			view: SavedviewtypesSavedViewDTO,
		): SavedviewtypesSavedViewDTO => ({ ...view, ...updated.get(view.id) });

		const findView = (id: string): SavedviewtypesSavedViewDTO | undefined => {
			const view = created.find((item) => item.id === id) ?? savedViewById(id);

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
						data: [...(list.data ?? []), ...created]
							.filter((view) => !deleted.has(view.id))
							.map(current),
					};
				}),
			),

			rest.get(`${API}/:id`, (req, res, ctx) => {
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
