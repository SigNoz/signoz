import React from 'react';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { useAppContext } from 'providers/App/App';

export const DEFAULT_MESSAGE = 'Not available in no-auth mode';

interface NoAuthGuardProps {
	children: React.ReactElement;
	message?: string;
	disabled?: boolean;
}

export function NoAuthGuard({
	children,
	message = DEFAULT_MESSAGE,
	disabled,
}: NoAuthGuardProps): JSX.Element {
	const { isNoAuthMode } = useAppContext();

	if (!isNoAuthMode) {
		return disabled ? React.cloneElement(children, { disabled: true }) : children;
	}

	const disabledChild = React.cloneElement(children, { disabled: true });

	return (
		<TooltipProvider>
			<TooltipRoot>
				<TooltipTrigger asChild>
					<span
						data-no-auth-trigger
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
