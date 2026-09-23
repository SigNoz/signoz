import { type ReactNode, useLayoutEffect } from 'react';

import { chromePerformanceTanstackTableEndHover } from './perfDevtools';
import { useIsRowHovered } from './TanStackTableStateContext';
import { Tooltip, TooltipProps, TooltipProvider } from '@signozhq/ui/tooltip';

export type HoverTooltipProps = Omit<TooltipProps, 'open'> & {
	rowId: string;
	children: ReactNode;
};

export function TanStackHoverTooltip({
	rowId,
	children,
	...tooltipProps
}: HoverTooltipProps): JSX.Element {
	const isHovered = useIsRowHovered(rowId);

	useLayoutEffect(() => {
		if (isHovered) {
			chromePerformanceTanstackTableEndHover(rowId);
		}
	}, [isHovered, rowId]);

	if (!isHovered) {
		return <>{children}</>;
	}

	return (
		<TooltipProvider delay={700}>
			<Tooltip {...tooltipProps}>{children}</Tooltip>
		</TooltipProvider>
	);
}
