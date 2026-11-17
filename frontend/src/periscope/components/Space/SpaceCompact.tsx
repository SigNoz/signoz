// eslint-disable-next-line no-restricted-imports -- reads antd's component-scoped compact-item context, not shared state
import { useContext } from 'react';
import { SpaceCompactItemContext } from 'antd/es/space/Compact';

import type { SpaceCompactProps } from './types';
import { getChildKey, getSpaceCompactClassName, toChildArray } from './utils';

/**
 * Drop-in replacement for antd's `Space.Compact` (5.11). Children read antd's
 * own compact-item context, so antd Buttons and Inputs collapse their borders
 * and radii as they do inside antd's.
 */
function SpaceCompact({
	size,
	direction,
	block,
	className,
	children,
	...rest
}: SpaceCompactProps): JSX.Element | null {
	const parentItem = useContext(SpaceCompactItemContext);
	const childNodes = toChildArray(children);
	if (childNodes.length === 0) {
		return null;
	}
	const lastIndex = childNodes.length - 1;
	return (
		<div
			className={getSpaceCompactClassName({ className, direction, block })}
			{...rest}
		>
			{childNodes.map((child, index) => (
				<SpaceCompactItemContext.Provider
					key={getChildKey(child, index)}
					value={{
						compactSize: size,
						compactDirection: direction,
						isFirstItem: index === 0 && (!parentItem || parentItem.isFirstItem),
						isLastItem: index === lastIndex && (!parentItem || parentItem.isLastItem),
					}}
				>
					{child}
				</SpaceCompactItemContext.Provider>
			))}
		</div>
	);
}

export default SpaceCompact;
