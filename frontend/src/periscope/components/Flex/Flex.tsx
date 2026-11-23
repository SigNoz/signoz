import { forwardRef } from 'react';

import type { FlexProps } from './types';
import { getFlexClassName, getFlexStyle } from './utils';

/** Drop-in replacement for antd's `Flex` (5.11). */
const Flex = forwardRef<HTMLDivElement, FlexProps>(function Flex(
	{
		className,
		style,
		flex,
		gap,
		vertical = false,
		wrap,
		justify,
		align,
		children,
		...rest
	},
	ref,
) {
	return (
		<div
			ref={ref}
			className={getFlexClassName({
				className,
				vertical,
				wrap,
				align,
				justify,
				gap,
			})}
			style={getFlexStyle(style, flex, gap)}
			{...rest}
		>
			{children}
		</div>
	);
});

export default Flex;
