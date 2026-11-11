import type { SpaceCompactProps } from './types';
import { getSpaceCompactClassName, toChildArray } from './utils';

/**
 * Drop-in replacement for antd's `Space.Compact` (5.11) container. Unlike
 * antd's, it does not restyle the borders and radii of antd children.
 */
function SpaceCompact({
	direction,
	block,
	className,
	children,
	...rest
}: SpaceCompactProps): JSX.Element | null {
	const childNodes = toChildArray(children);
	if (childNodes.length === 0) {
		return null;
	}
	return (
		<div
			className={getSpaceCompactClassName({ className, direction, block })}
			{...rest}
		>
			{childNodes}
		</div>
	);
}

export default SpaceCompact;
