import { Redirect as RouterRedirect } from 'react-router-dom';

import type { To } from './types';
import { withState } from './utils';

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
	return <RouterRedirect to={withState(to, state)} push={!replace} />;
}

Redirect.defaultProps = {
	replace: true,
	state: undefined,
};
