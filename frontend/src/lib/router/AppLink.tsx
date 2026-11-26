import { forwardRef } from 'react';
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

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
	function AppLink({ to, replace, state, children, ...rest }, ref) {
		return (
			<Link ref={ref} to={to} replace={replace} state={state} {...rest}>
				{children}
			</Link>
		);
	},
);
