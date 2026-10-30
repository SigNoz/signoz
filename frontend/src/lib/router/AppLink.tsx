import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { To } from './types';
import { useAppLocation } from './useAppLocation';
import { withState } from './utils';

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
		const location = useAppLocation();

		return (
			<Link
				ref={ref}
				to={withState(to, state, location)}
				replace={replace}
				{...rest}
			>
				{children}
			</Link>
		);
	},
);
