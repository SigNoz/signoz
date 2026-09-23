import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

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
	return (
		<Link to={to} replace={replace} state={state} {...rest}>
			{children}
		</Link>
	);
}

AppLink.defaultProps = {
	replace: undefined,
	state: undefined,
	children: undefined,
};
