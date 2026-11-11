import { forwardRef, useMemo, useState } from 'react';

import RowContext, { type RowContextState } from './RowContext';
import type { RowProps } from './types';
import useLastDefined from './useLastDefined';
import useScreens from './useScreens';
import {
	ALL_SCREENS,
	getRowClassName,
	getRowStyle,
	isResponsiveGutter,
	isResponsiveValue,
	resolveGutters,
	resolveResponsive,
} from './utils';

/** Drop-in replacement for antd's `Row` (5.11). */
const Row = forwardRef<HTMLDivElement, RowProps>(function Row(
	{ className, style, gutter = 0, align, justify, wrap, children, ...rest },
	ref,
) {
	// Like antd, only a gutter responsive on mount follows the viewport; one
	// made responsive later resolves as if every breakpoint matched.
	const [tracksGutter] = useState(() => isResponsiveGutter(gutter));
	const screens = useScreens(
		tracksGutter || isResponsiveValue(align) || isResponsiveValue(justify),
	);
	const [gutterH, gutterV] = resolveGutters(
		gutter,
		tracksGutter ? screens : ALL_SCREENS,
	);
	const mergedAlign = useLastDefined(resolveResponsive(align, screens));
	const mergedJustify = useLastDefined(resolveResponsive(justify, screens));

	// antd hands Col unresolved (`undefined`) gutter entries under this type.
	const rowContext = useMemo(
		(): RowContextState => ({
			gutter: [gutterH, gutterV] as RowContextState['gutter'],
			wrap,
		}),
		[gutterH, gutterV, wrap],
	);

	return (
		<RowContext.Provider value={rowContext}>
			<div
				{...rest}
				className={getRowClassName({
					className,
					wrap,
					align: mergedAlign,
					justify: mergedJustify,
				})}
				style={getRowStyle([gutterH, gutterV], style)}
				ref={ref}
			>
				{children}
			</div>
		</RowContext.Provider>
	);
});

export default Row;
