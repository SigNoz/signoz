import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';
import { server } from 'mocks-server/server';
import { rest } from 'msw';

export const API = 'http://localhost/api/v2/saved_views';

export const TEST_USER_EMAIL = 'test@signoz.io';

export interface Requests {
	created: unknown[];
	updated: { id: string; body: unknown }[];
	deleted: string[];
}

// Mutates `views` on create, update and delete, so a refetch sees the change.
export function mockSavedViewsApi(
	views: SavedviewtypesSavedViewDTO[],
	{
		createStatus = 201,
		createdId = 'view-new',
		getDelay = 0,
		listFailures = 0,
	}: {
		createStatus?: number;
		createdId?: string;
		getDelay?: number;
		listFailures?: number;
	} = {},
): Requests {
	const requests: Requests = { created: [], updated: [], deleted: [] };
	let failedLists = 0;
	server.use(
		rest.get(API, (req, res, ctx) => {
			if (failedLists < listFailures) {
				failedLists += 1;
				return res(ctx.status(500), ctx.json({ status: 'error' }));
			}
			const source = req.url.searchParams.get('source');
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: views.filter((view) => !source || view.source === source),
				}),
			);
		}),
		rest.get(`${API}/:id`, (req, res, ctx) => {
			const view = views.find((v) => v.id === req.params.id);
			if (!view) {
				return res(ctx.status(404), ctx.json({ status: 'error' }));
			}
			return res(
				ctx.delay(getDelay),
				ctx.status(200),
				ctx.json({ status: 'success', data: view }),
			);
		}),
		rest.post(API, async (req, res, ctx) => {
			const body = await req.json();
			requests.created.push(body);
			if (createStatus >= 400) {
				return res(
					ctx.status(createStatus),
					ctx.json({
						status: 'error',
						error: { code: 'internal', message: 'boom' },
					}),
				);
			}
			views.push({
				...body,
				id: createdId,
				createdBy: TEST_USER_EMAIL,
				updatedBy: TEST_USER_EMAIL,
			} as SavedviewtypesSavedViewDTO);
			return res(
				ctx.status(createStatus),
				ctx.json({ status: 'success', data: { id: createdId } }),
			);
		}),
		rest.put(`${API}/:id`, async (req, res, ctx) => {
			const body = await req.json();
			const id = String(req.params.id);
			requests.updated.push({ id, body });
			const index = views.findIndex((v) => v.id === id);
			if (index >= 0) {
				views[index] = { ...views[index], spec: body.spec };
			}
			return res(ctx.status(204));
		}),
		rest.delete(`${API}/:id`, (req, res, ctx) => {
			const id = String(req.params.id);
			requests.deleted.push(id);
			const index = views.findIndex((v) => v.id === id);
			if (index >= 0) {
				views.splice(index, 1);
			}
			return res(ctx.status(204));
		}),
	);
	return requests;
}
