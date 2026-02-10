import { ResponseResolver, restContext, RestRequest } from 'msw';

export const createErrorResponse = (
	status: number,
	code: string,
	message: string,
): ResponseResolver<RestRequest, typeof restContext> => (
	_req,
	res,
	ctx,
): ReturnType<ResponseResolver<RestRequest, typeof restContext>> =>
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
