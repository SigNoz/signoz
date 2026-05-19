import React from 'react';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { useAppContext } from 'providers/App/App';

export const DEFAULT_NO_AUTH_MESSAGE = 'Not available in no-auth mode';

interface NoAuthGuardProps {
	children: React.ReactElement;
	message?: string;
	disabled?: boolean;
	testId?: string;
}

export function NoAuthGuard({
	children,
	message = DEFAULT_NO_AUTH_MESSAGE,
	disabled,
	testId,
}: NoAuthGuardProps): JSX.Element {
	const { isNoAuthMode } = useAppContext();

	if (!isNoAuthMode) {
		return disabled ? React.cloneElement(children, { disabled: true }) : children;
	}

	const disabledChild = React.cloneElement(children, {
		disabled: true,
		style: { ...(children.props.style ?? {}), pointerEvents: 'none' },
	});

	return (
		<TooltipProvider>
			<TooltipRoot>
				<TooltipTrigger asChild>
					<span
						data-no-auth-trigger
						data-testid={testId}
						style={{ display: 'inline-flex', cursor: 'not-allowed' }}
					>
						{disabledChild}
					</span>
				</TooltipTrigger>
				<TooltipContent>{message}</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
}
