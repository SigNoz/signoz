import type {
	DefaultBodyType,
	MockedResponse,
	PathParams,
	ResponseComposition,
	RestContext,
	RestRequest,
} from 'msw';

export const API_RESULTS = ['success', 'loading', 'error'] as const;

export type ApiResult = (typeof API_RESULTS)[number];

const SERVER_ERROR = {
	status: 'error',
	error: {
		code: 'internal',
		message: 'Something went wrong on the server',
		url: '',
		errors: [],
	},
};

/**
 * How a mutation endpoint answers for a result: never, with a 500, or with
 * whatever `ok` builds from the request.
 */
export const settle = async (
	result: ApiResult,
	req: RestRequest<DefaultBodyType, PathParams<string>>,
	res: ResponseComposition,
	ctx: RestContext,
	ok: (
		req: RestRequest<DefaultBodyType, PathParams<string>>,
	) => object | Promise<object>,
): Promise<MockedResponse> => {
	if (result === 'loading') {
		return res(ctx.delay('infinite'));
	}

	if (result === 'error') {
		return res(ctx.status(500), ctx.json(SERVER_ERROR));
	}

	return res(ctx.status(200), ctx.json(await ok(req)));
};
