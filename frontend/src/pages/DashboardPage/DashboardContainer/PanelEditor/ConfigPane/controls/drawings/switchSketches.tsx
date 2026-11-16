import SketchSvg from './SketchSvg';

/** Muted sketches for on/off cards. */
export const SWITCH_SKETCHES = {
	hideHeader: (
		<SketchSvg>
			<rect x={3} y={3} width={34} height={16} rx={2} />
			<path d="M3 8 H37" strokeDasharray="3 3" />
		</SketchSvg>
	),
	fillGaps: (
		<SketchSvg>
			<path d="M3 9 L11 7 L16 19 L26 19 L30 8 L37 6" />
		</SketchSvg>
	),
	points: (
		<SketchSvg>
			<path d="M4 17 L14 9 L24 13 L36 6" />
			{[
				[4, 17],
				[14, 9],
				[24, 13],
				[36, 6],
			].map(([cx, cy]) => (
				<circle key={cx} cx={cx} cy={cy} r={2} fill="var(--l3-foreground)" />
			))}
		</SketchSvg>
	),
	percentiles: (
		<SketchSvg>
			<path d="M3 19 L9 13 L15 7 L21 9 L27 14 L33 17 L37 19" />
			<path d="M15 3 V20" strokeDasharray="2 2" />
			<path d="M29 3 V20" strokeDasharray="2 2" />
		</SketchSvg>
	),
	combine: (
		<SketchSvg>
			<rect x={4} y={10} width={6} height={10} />
			<rect x={13} y={4} width={6} height={16} />
			<rect x={22} y={8} width={6} height={12} />
			<rect x={31} y={13} width={6} height={7} />
		</SketchSvg>
	),
} satisfies Record<string, JSX.Element>;
