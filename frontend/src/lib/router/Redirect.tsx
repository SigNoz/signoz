import { Redirect as RouterRedirect } from 'react-router-dom';
import { parsePath } from 'history';

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
	const target =
		state === undefined
			? to
			: { ...(typeof to === 'string' ? parsePath(to) : to), state };

	return <RouterRedirect to={target} push={!replace} />;
}

Redirect.defaultProps = {
	replace: true,
	state: undefined,
};
