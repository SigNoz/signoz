import { forwardRef } from 'react';

import SpaceCompact from './SpaceCompact';
import SpaceItem from './SpaceItem';
import type { SpaceProps } from './types';
import {
	getChildKey,
	getLatestIndex,
	getSpaceClassName,
	getSpaceStyle,
	toChildArray,
} from './utils';

/** Drop-in replacement for antd's `Space` (5.11). */
const SpaceRoot = forwardRef<HTMLDivElement, SpaceProps>(function Space(
	{
		size = 'small',
		direction = 'horizontal',
		align,
		split,
		wrap = false,
		className,
		style,
		children,
		...rest
	},
	ref,
) {
	const childNodes = toChildArray(children, true);
	if (childNodes.length === 0) {
		return null;
	}
	const latestIndex = getLatestIndex(childNodes);

	return (
		<div
			ref={ref}
			className={getSpaceClassName({ className, direction, align, size })}
			style={getSpaceStyle(style, size, wrap)}
			{...rest}
		>
			{childNodes.map((child, index) => (
				<SpaceItem
					key={getChildKey(child, index)}
					split={split}
					showSplit={index < latestIndex}
				>
					{child}
				</SpaceItem>
			))}
		</div>
	);
});

const Space = Object.assign(SpaceRoot, { Compact: SpaceCompact });

export default Space;
