// RowContext mirrors antd's: layout from the enclosing Row, not shared state.
// eslint-disable-next-line no-restricted-imports
import { forwardRef, useContext } from 'react';

import RowContext from '../Row/RowContext';
import type { ColProps } from './types';
import { getColClassName, getColStyle } from './utils';

/** Drop-in replacement for antd's `Col` (5.11). */
const Col = forwardRef<HTMLDivElement, ColProps>(function Col(
	{
		className,
		style,
		flex,
		span,
		order,
		offset,
		push,
		pull,
		xs,
		sm,
		md,
		lg,
		xl,
		xxl,
		children,
		...rest
	},
	ref,
) {
	const rowContext = useContext(RowContext);

	return (
		<div
			{...rest}
			ref={ref}
			className={getColClassName({
				className,
				span,
				order,
				offset,
				push,
				pull,
				xs,
				sm,
				md,
				lg,
				xl,
				xxl,
			})}
			style={getColStyle(style, flex, rowContext)}
		>
			{children}
		</div>
	);
});

export default Col;
