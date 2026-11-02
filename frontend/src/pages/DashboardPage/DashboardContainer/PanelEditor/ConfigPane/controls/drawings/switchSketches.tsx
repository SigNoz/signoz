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
	rank: (
		<SketchSvg>
			{[5, 11, 17].map((y, index) => (
				<g key={y}>
					<circle cx={4} cy={y} r={1.2} fill="var(--l3-foreground)" />
					<path d={`M9 ${y} H${36 - index * 9}`} />
				</g>
			))}
		</SketchSvg>
	),
	share: (
		<SketchSvg>
			<path d="M3 11 H37" strokeDasharray="3 3" />
			<rect x={3} y={8} width={22} height={6} fill="var(--l3-foreground)" />
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
