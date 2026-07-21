import { useLayoutEffect, type ReactNode } from 'react';

import { chromePerformanceTanstackTableEndHover } from './perfDevtools';
import { useIsRowHovered } from './TanStackTableStateContext';
import { TooltipSimple, TooltipSimpleProps } from '@signozhq/ui/tooltip';

export type HoverTooltipProps = Omit<TooltipSimpleProps, 'open'> & {
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

	return <TooltipSimple {...tooltipProps}>{children}</TooltipSimple>;
}
