type Created = 201;

type Success = 200;

type SuccessNoContent = 204;

type Forbidden = 403;

type BadRequest = 400;

type Unauthorized = 401;

type NotFound = 404;

type Conflict = 409;

type ServerError = 500;

export type SuccessStatusCode = Created | Success | SuccessNoContent;

export type ErrorStatusCode =
	| Forbidden
	| Forbidden
	| Unauthorized
	| NotFound
	| ServerError
	| BadRequest
	| Conflict;
