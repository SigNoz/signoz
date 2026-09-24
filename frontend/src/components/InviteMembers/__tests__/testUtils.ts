import { RestHandler } from 'msw';
import { rest } from 'mocks-server/server';

export const CREATE_USER_ENDPOINT = '*/api/v2/users';
export const LIST_ROLES_ENDPOINT = '*/api/v1/roles';

export const MOCK_ROLES = [
	{ id: 'role-admin', name: 'Admin', description: 'Admin role' },
	{ id: 'role-editor', name: 'Editor', description: 'Editor role' },
	{ id: 'role-viewer', name: 'Viewer', description: 'Viewer role' },
];

export const VALID_EMAIL = 'alice@signoz.io';
export const INVALID_EMAIL = 'not-an-email';

export function createSuccessHandler(): RestHandler {
	return rest.post(CREATE_USER_ENDPOINT, (_, res, ctx) =>
		res(ctx.status(201), ctx.json({ data: { id: 'user-123' } })),
	);
}

export function createErrorHandler(
	code: string,
	message: string,
	status = 409,
): RestHandler {
	return rest.post(CREATE_USER_ENDPOINT, (_, res, ctx) =>
		res(
			ctx.status(status),
			ctx.json({
				errors: [{ code, msg: message }],
			}),
		),
	);
}

export function createRolesHandler(): RestHandler {
	return rest.get(LIST_ROLES_ENDPOINT, (_, res, ctx) =>
		res(ctx.status(200), ctx.json({ data: MOCK_ROLES })),
	);
}

export function createTrackingHandler(): {
	handler: RestHandler;
	calls: unknown[];
} {
	const calls: unknown[] = [];
	const handler = rest.post(CREATE_USER_ENDPOINT, async (req, res, ctx) => {
		const body = await req.json();
		calls.push(body);
		return res(ctx.status(201), ctx.json({ data: { id: 'user-123' } }));
	});
	return { handler, calls };
}
