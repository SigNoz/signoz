import { Children, Fragment, isValidElement } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import cx from 'classnames';

import styles from './Space.module.scss';
import type {
	SpaceAlign,
	SpaceCompactProps,
	SpaceProps,
	SpaceSize,
	SpaceSizePreset,
} from './types';

const ALIGN_CLASS: Record<SpaceAlign, string> = {
	center: styles.alignCenter,
	start: styles.alignStart,
	end: styles.alignEnd,
	baseline: styles.alignBaseline,
};

const GAP_ROW_CLASS: Record<SpaceSizePreset, string> = {
	small: styles.gapRowSmall,
	middle: styles.gapRowMiddle,
	large: styles.gapRowLarge,
};

const GAP_COL_CLASS: Record<SpaceSizePreset, string> = {
	small: styles.gapColSmall,
	middle: styles.gapColMiddle,
	large: styles.gapColLarge,
};

const SIZE_PRESETS: readonly unknown[] = Object.keys(GAP_ROW_CLASS);

function isPresetSize(size: SpaceSize | undefined): size is SpaceSizePreset {
	return SIZE_PRESETS.includes(size);
}

function isValidGapNumber(size: SpaceSize | undefined): size is number {
	return typeof size === 'number' && size !== 0 && !Number.isNaN(size);
}

/**
 * Flattens arrays and fragments like antd's `toArray`. `false` and `true`
 * arrive as `null`. Empty children are kept only when `keepEmpty` is set, and
 * never inside a nested array.
 */
export function toChildArray(
	children: ReactNode,
	keepEmpty = false,
): ReactNode[] {
	let result: ReactNode[] = [];
	Children.forEach(children, (child: ReactNode) => {
		if ((child === null || child === undefined) && !keepEmpty) {
			return;
		}
		if (Array.isArray(child)) {
			result = result.concat(toChildArray(child));
		} else if (
			isValidElement<{ children?: ReactNode }>(child) &&
			child.type === Fragment
		) {
			result = result.concat(toChildArray(child.props.children, keepEmpty));
		} else {
			result.push(child);
		}
	});
	return result;
}

export function getLatestIndex(childNodes: ReactNode[]): number {
	let latestIndex = 0;
	childNodes.forEach((child, index) => {
		if (child !== null && child !== undefined) {
			latestIndex = index;
		}
	});
	return latestIndex;
}

export function getChildKey(child: ReactNode, index: number): string | number {
	return (isValidElement(child) && child.key) || `item-${index}`;
}

function splitSize(
	size: NonNullable<SpaceProps['size']>,
): [SpaceSize, SpaceSize] {
	return Array.isArray(size) ? size : [size, size];
}

type SpaceClassNameInput = Pick<
	SpaceProps,
	'className' | 'direction' | 'align'
> & {
	size: NonNullable<SpaceProps['size']>;
};

export function getSpaceClassName({
	className,
	direction,
	align,
	size,
}: SpaceClassNameInput): string {
	const [horizontalSize, verticalSize] = splitSize(size);
	const mergedAlign =
		align === undefined && direction === 'horizontal' ? 'center' : align;
	return cx(
		styles.space,
		direction === 'vertical' && styles.vertical,
		mergedAlign && ALIGN_CLASS[mergedAlign],
		isPresetSize(verticalSize) && GAP_ROW_CLASS[verticalSize],
		isPresetSize(horizontalSize) && GAP_COL_CLASS[horizontalSize],
		className,
	);
}

export function getSpaceStyle(
	style: CSSProperties | undefined,
	size: NonNullable<SpaceProps['size']>,
	wrap: boolean | undefined,
): CSSProperties {
	const [horizontalSize, verticalSize] = splitSize(size);
	const gapStyle: CSSProperties = {};
	if (wrap) {
		gapStyle.flexWrap = 'wrap';
	}
	if (!isPresetSize(horizontalSize) && isValidGapNumber(horizontalSize)) {
		gapStyle.columnGap = horizontalSize;
	}
	if (!isPresetSize(verticalSize) && isValidGapNumber(verticalSize)) {
		gapStyle.rowGap = verticalSize;
	}
	return { ...gapStyle, ...style };
}

export function getSpaceCompactClassName({
	className,
	direction,
	block,
}: Pick<SpaceCompactProps, 'className' | 'direction' | 'block'>): string {
	return cx(
		styles.compact,
		block && styles.compactBlock,
		direction === 'vertical' && styles.vertical,
		className,
	);
}
