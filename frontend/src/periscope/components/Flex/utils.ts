import type { CSSProperties } from 'react';
import cx from 'classnames';

import styles from './Flex.module.scss';
import type {
	FlexAlign,
	FlexGapPreset,
	FlexJustify,
	FlexProps,
	FlexWrap,
} from './types';

const WRAP_CLASS: Record<FlexWrap, string> = {
	wrap: styles.wrapWrap,
	nowrap: styles.wrapNowrap,
	'wrap-reverse': styles.wrapWrapReverse,
};

// antd 5.11 drops the class for an explicit `align="stretch"`; items fall back
// to `normal`, which lays out the same.
const ALIGN_CLASS: Record<FlexAlign, string | undefined> = {
	center: styles.alignCenter,
	start: styles.alignStart,
	end: styles.alignEnd,
	'flex-start': styles.alignFlexStart,
	'flex-end': styles.alignFlexEnd,
	'self-start': styles.alignSelfStart,
	'self-end': styles.alignSelfEnd,
	baseline: styles.alignBaseline,
	normal: styles.alignNormal,
	stretch: undefined,
};

const JUSTIFY_CLASS: Record<FlexJustify, string> = {
	'flex-start': styles.justifyFlexStart,
	'flex-end': styles.justifyFlexEnd,
	start: styles.justifyStart,
	end: styles.justifyEnd,
	center: styles.justifyCenter,
	'space-between': styles.justifySpaceBetween,
	'space-around': styles.justifySpaceAround,
	'space-evenly': styles.justifySpaceEvenly,
	stretch: styles.justifyStretch,
	normal: styles.justifyNormal,
	left: styles.justifyLeft,
	right: styles.justifyRight,
};

const GAP_CLASS: Record<FlexGapPreset, string> = {
	small: styles.gapSmall,
	middle: styles.gapMiddle,
	large: styles.gapLarge,
};

const GAP_PRESETS: readonly unknown[] = Object.keys(GAP_CLASS);

function isGapPreset(gap: FlexProps['gap']): gap is FlexGapPreset {
	return GAP_PRESETS.includes(gap);
}

type FlexClassNameInput = Pick<
	FlexProps,
	'className' | 'vertical' | 'wrap' | 'align' | 'justify' | 'gap'
>;

export function getFlexClassName({
	className,
	vertical,
	wrap,
	align,
	justify,
	gap,
}: FlexClassNameInput): string {
	return cx(
		className,
		styles.flex,
		wrap && WRAP_CLASS[wrap],
		align ? ALIGN_CLASS[align] : vertical && styles.alignStretch,
		justify && JUSTIFY_CLASS[justify],
		isGapPreset(gap) && GAP_CLASS[gap],
		vertical && styles.vertical,
	);
}

export function getFlexStyle(
	style: CSSProperties | undefined,
	flex: FlexProps['flex'],
	gap: FlexProps['gap'],
): CSSProperties {
	const merged: CSSProperties = { ...style };
	if (flex) {
		merged.flex = flex;
	}
	if (gap && !isGapPreset(gap)) {
		merged.gap = gap;
	}
	return merged;
}
