import { Navigate } from 'react-router-dom';

import type { To } from './types';

export interface RedirectProps {
	to: To;
	/**
	 * Defaults to `true`, matching v5's `<Redirect>`. v6's `<Navigate>` pushes
	 * unless told otherwise, which is invisible until someone presses Back.
	 */
	replace?: boolean;
	state?: unknown;
}

export function Redirect({
	to,
	replace = true,
	state,
}: RedirectProps): JSX.Element {
	return <Navigate to={to} replace={replace} state={state} />;
}

Redirect.defaultProps = {
	replace: true,
	state: undefined,
};
