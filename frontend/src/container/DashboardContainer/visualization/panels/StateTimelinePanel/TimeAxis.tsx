import { CSSProperties, memo, useMemo } from 'react';

import { TimeRange } from './utils/transformData';
import { generateTicks, TickMark } from './utils/timeAxisUtils';

export interface TimeAxisProps {
	timeRange: TimeRange;
	width: number;
	timezone: string;
}

const AXIS_HEIGHT = 30;
const TICK_HEIGHT = 6;

const containerStyle: CSSProperties = {
	position: 'relative',
	width: '100%',
	height: `${AXIS_HEIGHT}px`,
	borderTop: '1px solid var(--bg-ink-200, #e5e7eb)',
	overflow: 'hidden',
	userSelect: 'none',
};

const tickLineStyle: CSSProperties = {
	position: 'absolute',
	top: 0,
	width: '1px',
	height: `${TICK_HEIGHT}px`,
	backgroundColor: 'var(--bg-ink-300, #9ca3af)',
};

const tickLabelStyle: CSSProperties = {
	position: 'absolute',
	top: `${TICK_HEIGHT + 2}px`,
	fontSize: '11px',
	color: 'var(--text-ink-300, #6b7280)',
	whiteSpace: 'nowrap',
	transform: 'translateX(-50%)',
};

function TimeAxis({ timeRange, width, timezone }: TimeAxisProps): JSX.Element {
	const ticks: TickMark[] = useMemo(
		() => generateTicks(timeRange, width, timezone),
		[timeRange, width, timezone],
	);

	return (
		<div style={containerStyle}>
			{ticks.map((tick) => {
				const leftPx = tick.position * width;

				return (
					<div key={tick.timestamp}>
						<div
							style={{
								...tickLineStyle,
								left: `${leftPx}px`,
							}}
						/>
						<div
							style={{
								...tickLabelStyle,
								left: `${leftPx}px`,
							}}
						>
							{tick.label}
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default memo(TimeAxis);
