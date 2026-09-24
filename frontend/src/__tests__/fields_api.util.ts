import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';

export function mockFieldsAPIsWithEmptyResponse(): void {
	server.use(
		rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { keys: {}, complete: true } }),
			),
		),
		rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/values`, (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { values: {}, complete: true } }),
			),
		),
	);
}
