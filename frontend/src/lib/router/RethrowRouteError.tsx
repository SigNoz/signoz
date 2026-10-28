import { useRouteError } from 'react-router';

/**
 * Rethrows past the router, so a render error reaches the next error boundary
 * outside it (or fails a test) instead of rendering the router's default error
 * page.
 */
export function RethrowRouteError(): never {
	throw useRouteError();
}
