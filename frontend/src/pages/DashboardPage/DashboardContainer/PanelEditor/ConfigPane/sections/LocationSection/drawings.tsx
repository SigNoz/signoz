import TileSvg from '../../controls/drawings/TileSvg';

const FILLED = { fill: 'currentColor', stroke: 'none' } as const;
const SHAPES = [
	'M4 7 L20 4 L25 13 L15 20 L5 16Z',
	'M27 6 L43 8 L41 19 L29 18Z',
	'M45 9 L59 5 L61 18 L47 20Z',
];
const SHAPE_OPACITY = [1, 0.55, 0.25];
const POINTS = [
	[10, 15, 3, 1],
	[20, 7, 2, 1],
	[29, 16, 4, 0.6],
	[40, 8, 2.5, 1],
	[50, 15, 2, 1],
	[56, 6, 3, 0.6],
];

const shaded = (
	<TileSvg>
		{SHAPES.map((d, index) => (
			<path key={d} d={d} {...FILLED} opacity={SHAPE_OPACITY[index]} />
		))}
	</TileSvg>
);

const points = (
	<TileSvg>
		{POINTS.map(([cx, cy, r, opacity]) => (
			<circle key={cx} cx={cx} cy={cy} r={r} {...FILLED} opacity={opacity} />
		))}
	</TileSvg>
);

export const LOCATION_DRAWINGS = {
	country: shaded,
	state: (
		<TileSvg>
			<rect x={6} y={5} width={18} height={7} {...FILLED} />
			<rect x={24} y={12} width={18} height={7} {...FILLED} opacity={0.5} />
			<rect x={42} y={5} width={16} height={7} {...FILLED} opacity={0.25} />
			<path d="M6 5 H58 V19 H6Z M24 5 V19 M42 5 V19 M6 12 H58" strokeWidth={1.6} />
		</TileSvg>
	),
	point: points,
	regions: shaded,
	bubbles: (
		<TileSvg>
			<path d={SHAPES.join(' ')} strokeWidth={1.2} opacity={0.45} />
			<circle cx={14} cy={12} r={6} {...FILLED} />
			<circle cx={35} cy={13} r={3.5} {...FILLED} />
			<circle cx={53} cy={12} r={2} {...FILLED} />
		</TileSvg>
	),
	points,
};
