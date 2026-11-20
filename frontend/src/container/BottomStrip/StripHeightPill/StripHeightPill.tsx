import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Slider } from '@signozhq/ui/slider';

import {
	BOTTOM_STRIP_HEIGHT_MARKS,
	BOTTOM_STRIP_MAX_HEIGHT,
	BOTTOM_STRIP_MIN_HEIGHT,
} from '../constants';
import { useBottomStripStore } from '../store/useBottomStripStore';
import { useWheelNudge } from './useWheelNudge';

import styles from './StripHeightPill.module.scss';

/** Dev tool: drags the strip's height between the min and max. */
function StripHeightPill(): JSX.Element {
	const height = useBottomStripStore((s) => s.height);
	const setHeight = useBottomStripStore((s) => s.setHeight);
	const nudgeHeight = useBottomStripStore((s) => s.nudgeHeight);
	const pillRef = useRef<HTMLDivElement>(null);

	useWheelNudge(pillRef, nudgeHeight);

	// Portalled so the strip's stacking context can't put page content above it.
	return createPortal(
		<div
			ref={pillRef}
			className={styles.pill}
			data-testid="bottom-strip-height-pill"
		>
			<Slider
				className={styles.slider}
				min={BOTTOM_STRIP_MIN_HEIGHT}
				max={BOTTOM_STRIP_MAX_HEIGHT}
				step={1}
				marks={BOTTOM_STRIP_HEIGHT_MARKS}
				value={height}
				onChange={(value): void =>
					setHeight(Array.isArray(value) ? value[0] : value)
				}
				aria-label="Bottom strip height"
				testId="bottom-strip-height-slider"
			/>
			<span className={styles.value}>{height}px</span>
		</div>,
		document.body,
	);
}

export default StripHeightPill;
