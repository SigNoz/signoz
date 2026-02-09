import { MockedRequest, response, ResponseResolver, restContext } from 'msw';

export const createErrorResponse = (
	status: number,
	code: string,
	message: string,
): ResponseResolver<MockedRequest, typeof restContext> => (
	_req,
	res,
	ctx,
): ReturnType<typeof response> =>
	res(
		ctx.status(status),
		ctx.json({
			error: {
				code,
				message,
			},
		}),
	);

export const handleInternalServerError = createErrorResponse(
	500,
	'INTERNAL_SERVER_ERROR',
	'Internal server error occurred',
);
