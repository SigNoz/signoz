import { useMemo } from 'react';

import Styles from './ColorBar.module.scss';

export interface ColorBarProps {
	/** Low to high, drawn as hard-edged segments so the bar shows the same set of
	 *  colours as the cells. */
	ramp: string[];
	minLabel: string;
	maxLabel: string;
	/** 0..1. `null` hides the marker. */
	markerPosition?: number | null;
	/** What the colour encodes, e.g. "count". */
	label?: string;
	/** Keys the one state a ramp cannot express: a hatched data gap. */
	showNoDataKey?: boolean;
	'data-testid'?: string;
}

/** What a colour means, plus a marker for the value under the cursor. */
export default function ColorBar({
	ramp,
	minLabel,
	maxLabel,
	markerPosition = null,
	label,
	showNoDataKey = false,
	'data-testid': testId = 'color-bar',
}: ColorBarProps): JSX.Element | null {
	const gradient = useMemo(() => {
		if (ramp.length === 0) {
			return undefined;
		}
		if (ramp.length === 1) {
			return ramp[0];
		}
		const stops = ramp.flatMap((color, index) => {
			const from = (index / ramp.length) * 100;
			const to = ((index + 1) / ramp.length) * 100;
			return [`${color} ${from}%`, `${color} ${to}%`];
		});
		return `linear-gradient(to right, ${stops.join(', ')})`;
	}, [ramp]);

	if (gradient === undefined) {
		return null;
	}

	const clampedMarker =
		markerPosition === null ? null : Math.min(Math.max(markerPosition, 0), 1);

	return (
		<div className={Styles.container} data-testid={testId}>
			{label && <span className={Styles.caption}>{label}</span>}
			<span className={Styles.label}>{minLabel}</span>
			<div className={Styles.track} style={{ background: gradient }}>
				{clampedMarker !== null && (
					<span
						className={Styles.marker}
						style={{ left: `${clampedMarker * 100}%` }}
						data-testid={`${testId}-marker`}
					/>
				)}
			</div>
			<span className={Styles.label}>{maxLabel}</span>
			{showNoDataKey && (
				<div className={Styles.keys} data-testid={`${testId}-state-keys`}>
					<span className={Styles.key}>
						<span className={Styles.hatchSwatch} />
						no data
					</span>
				</div>
			)}
		</div>
	);
}
