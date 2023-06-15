export type Created = 201;

export type Success = 200;

export type Forbidden = 403;

export type BadRequest = 400;

export type Unauthorized = 401;

export type NotFound = 404;

export type Conflict = 409;

export type ServerError = 500;

export type SuccessStatusCode = Created | Success;

export type ErrorStatusCode =
	| Forbidden
	| Forbidden
	| Unauthorized
	| NotFound
	| ServerError
	| BadRequest
	| Conflict;

export enum ErrorType {
	NotFound = 'not_found',
}

export type StatusCode = SuccessStatusCode | ErrorStatusCode;
