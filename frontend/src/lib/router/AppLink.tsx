import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { parsePath } from 'history';

import type { To } from './types';

export interface AppLinkProps extends Omit<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	'href'
> {
	to: To;
	replace?: boolean;
	state?: unknown;
	children?: ReactNode;
}

export function AppLink({
	to,
	replace,
	state,
	children,
	...rest
}: AppLinkProps): JSX.Element {
	// v5 carries state inside `to`; v6 takes it as its own prop. The string form
	// has to be parsed first, or search and hash would land in `pathname`.
	const target =
		state === undefined
			? to
			: { ...(typeof to === 'string' ? parsePath(to) : to), state };

	return (
		<Link to={target} replace={replace} {...rest}>
			{children}
		</Link>
	);
}

AppLink.defaultProps = {
	replace: undefined,
	state: undefined,
	children: undefined,
};
