import React from 'react';
import { Tooltip, TooltipProvider } from '@signozhq/ui';
import { useAppContext } from 'providers/App/App';

export const DEFAULT_MESSAGE = 'Not available in no-auth mode';

interface NoAuthGuardProps {
	children: React.ReactElement;
	message?: string;
}

export function NoAuthGuard({
	children,
	message = DEFAULT_MESSAGE,
}: NoAuthGuardProps): JSX.Element {
	const { isNoAuthMode } = useAppContext();

	if (!isNoAuthMode) {
		return children;
	}

	const disabledChild = React.cloneElement(children, { disabled: true });

	return (
		<TooltipProvider>
			<Tooltip title={message} arrow>
				<span
					data-no-auth-trigger
					style={{ display: 'inline-flex', cursor: 'not-allowed' }}
				>
					{disabledChild}
				</span>
			</Tooltip>
		</TooltipProvider>
	);
}
