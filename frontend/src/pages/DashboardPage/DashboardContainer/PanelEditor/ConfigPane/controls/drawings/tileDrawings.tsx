import LegendFrame from './LegendFrame';
import TileSvg from './TileSvg';

const FILLED = { fill: 'currentColor', stroke: 'none' } as const;
const LINE = 'M4 17 L18 9 L30 14 L44 5 L60 11';
const POINTS = [
	[4, 18],
	[22, 8],
	[40, 14],
	[58, 6],
];

function interpDrawing(path: string): JSX.Element {
	return (
		<TileSvg tone="robin">
			<path d={path} />
			{POINTS.map(([cx, cy]) => (
				<circle key={cx} cx={cx} cy={cy} r={2.2} {...FILLED} />
			))}
		</TileSvg>
	);
}

export const TILE_DRAWINGS = {
	lineSolid: (
		<TileSvg tone="sakura">
			<path d={LINE} />
		</TileSvg>
	),
	lineDashed: (
		<TileSvg tone="sakura">
			<path d={LINE} strokeDasharray="5 5" />
		</TileSvg>
	),
	interpLinear: interpDrawing('M4 18 L22 8 L40 14 L58 6'),
	interpSpline: interpDrawing(
		'M4 18 C 12 18, 14 8, 22 8 S 34 14, 40 14 S 52 6, 58 6',
	),
	interpStepBefore: interpDrawing('M4 18 V8 H22 V14 H40 V6 H58'),
	interpStepAfter: interpDrawing('M4 18 H22 V8 H40 V14 H58 V6'),
	fillNone: (
		<TileSvg tone="forest">
			<path d={LINE} />
		</TileSvg>
	),
	fillSolid: (
		<TileSvg tone="forest">
			<path d={`${LINE} L60 22 L4 22Z`} {...FILLED} opacity={0.4} />
			<path d={LINE} />
		</TileSvg>
	),
	fillGradient: (
		<TileSvg tone="forest">
			<defs>
				<linearGradient id="config-tile-fill-gradient" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="currentColor" stopOpacity={0.55} />
					<stop offset="1" stopColor="currentColor" stopOpacity={0} />
				</linearGradient>
			</defs>
			<path
				d={`${LINE} L60 22 L4 22Z`}
				fill="url(#config-tile-fill-gradient)"
				stroke="none"
			/>
			<path d={LINE} />
		</TileSvg>
	),
	gapsConnect: (
		<TileSvg tone="amber">
			<path d="M4 16 L14 11 L22 14" />
			<path d="M22 14 L42 8" strokeDasharray="3 4" />
			<path d="M42 8 L50 11 L60 6" />
		</TileSvg>
	),
	gapsBreak: (
		<TileSvg tone="amber">
			<path d="M4 16 L14 11 L22 14" />
			<path d="M42 8 L50 11 L60 6" />
		</TileSvg>
	),
	scaleLinear: (
		<TileSvg tone="robin">
			<path d="M4 20 L60 4" />
		</TileSvg>
	),
	scaleLog: (
		<TileSvg tone="robin">
			<path d="M4 20 C 8 8, 20 5, 60 4" />
		</TileSvg>
	),
	barsSideBySide: (
		<TileSvg tone="robin">
			<rect x={10} y={10} width={7} height={12} {...FILLED} opacity={0.5} />
			<rect x={18} y={4} width={7} height={18} {...FILLED} />
			<rect x={36} y={12} width={7} height={10} {...FILLED} opacity={0.5} />
			<rect x={44} y={7} width={7} height={15} {...FILLED} />
		</TileSvg>
	),
	barsStacked: (
		<TileSvg tone="robin">
			<rect x={14} y={13} width={11} height={9} {...FILLED} opacity={0.5} />
			<rect x={14} y={4} width={11} height={8} {...FILLED} />
			<rect x={38} y={15} width={11} height={7} {...FILLED} opacity={0.5} />
			<rect x={38} y={8} width={11} height={6} {...FILLED} />
		</TileSvg>
	),
	areaOverlap: (
		<TileSvg tone="robin">
			<path d="M4 15 L18 9 L32 13 L46 6 L60 9" />
			<path d="M4 20 L18 15 L32 18 L46 13 L60 15" opacity={0.5} />
		</TileSvg>
	),
	areaStacked: (
		<TileSvg tone="robin">
			<path
				d="M4 22 L4 17 L18 15 L32 16 L46 14 L60 15 L60 22Z"
				{...FILLED}
				opacity={0.45}
			/>
			<path
				d="M4 17 L18 15 L32 16 L46 14 L60 15 L60 8 L46 5 L32 9 L18 6 L4 10Z"
				{...FILLED}
			/>
		</TileSvg>
	),
	areaPercent: (
		<TileSvg tone="robin">
			<path
				d="M4 22 L4 12 L18 10 L32 13 L46 9 L60 11 L60 22Z"
				{...FILLED}
				opacity={0.45}
			/>
			<path d="M4 12 L18 10 L32 13 L46 9 L60 11 L60 2 L4 2Z" {...FILLED} />
		</TileSvg>
	),
	legendBottom: (
		<LegendFrame>
			<path
				d="M8 15 L18 10 L28 13 L38 7 L48 9"
				stroke="var(--bg-robin-300)"
				strokeWidth={2}
			/>
			<path
				d="M8 23 H16 M22 23 H30 M36 23 H44"
				stroke="var(--l2-foreground)"
				strokeWidth={2.4}
			/>
		</LegendFrame>
	),
	legendRight: (
		<LegendFrame>
			<path
				d="M6 20 L14 12 L22 16 L32 8"
				stroke="var(--bg-robin-300)"
				strokeWidth={2}
			/>
			<path
				d="M40 9 H48 M40 15 H48 M40 21 H48"
				stroke="var(--l2-foreground)"
				strokeWidth={2.4}
			/>
		</LegendFrame>
	),
} satisfies Record<string, JSX.Element>;
