import { type ReactNode, useLayoutEffect, useMemo } from 'react';

import { chromePerformanceTanstackTableEndHover } from './perfDevtools';
import { useIsRowHovered } from './TanStackTableStateContext';
import {
	TooltipContentProps,
	TooltipSimple,
	TooltipSimpleProps,
} from '@signozhq/ui/tooltip';

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

	const tooltipContentProps = useMemo(
		() =>
			({
				onPointerDownOutside: (e): void => {
					e.preventDefault();
					e.stopPropagation();
				},
			}) satisfies TooltipContentProps,
		[],
	);

	if (!isHovered) {
		return <>{children}</>;
	}

	return (
		<TooltipSimple
			delayDuration={700}
			tooltipContentProps={tooltipContentProps}
			{...tooltipProps}
		>
			{children}
		</TooltipSimple>
	);
}
