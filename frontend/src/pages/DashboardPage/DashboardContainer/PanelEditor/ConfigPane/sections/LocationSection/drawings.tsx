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

/** A world outline and graticule in each projection's shape. */
const globe = (outline: string, graticule: string): JSX.Element => (
	<TileSvg>
		<path d={graticule} strokeWidth={0.8} opacity={0.5} />
		<path d={outline} strokeWidth={1.6} />
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
	mercator: globe(
		'M16 2 H48 V22 H16Z',
		'M24 2 V22 M32 2 V22 M40 2 V22 M16 4.9 H48 M16 7.9 H48 M16 10.1 H48 M16 12 H48 M16 13.9 H48 M16 16.1 H48 M16 19.1 H48',
	),
	equal_earth: globe(
		'M45.6 6 L46.8 6.3 L49.3 7 L51.7 8.1 L53.5 9.3 L54.6 10.6 L55 12 L54.6 13.4 L53.5 14.7 L51.7 15.9 L49.3 17 L46.8 17.7 L45.6 18 H18.4 L17.2 17.7 L14.7 17 L12.3 15.9 L10.5 14.7 L9.4 13.4 L9 12 L9.4 10.6 L10.5 9.3 L12.3 8.1 L14.7 7 L17.2 6.3 L18.4 6Z',
		'M32 6 V18 M25.2 6 L23.3 7 L21.2 9.3 L20.5 12 L21.2 14.7 L23.3 17 L25.2 18 M38.8 6 L40.7 7 L42.8 9.3 L43.5 12 L42.8 14.7 L40.7 17 L38.8 18 M11.6 8.5 H52.4 M9 12 H55 M11.6 15.5 H52.4',
	),
	natural_earth: globe(
		'M44.1 2 L47.8 3.1 L50 4.7 L51.8 6.4 L53.1 8.3 L53.8 10.1 L54 12 L53.8 13.9 L53.1 15.7 L51.8 17.6 L50 19.3 L47.8 20.9 L44.1 22 H19.9 L16.2 20.9 L14 19.3 L12.2 17.6 L10.9 15.7 L10.2 13.9 L10 12 L10.2 10.1 L10.9 8.3 L12.2 6.4 L14 4.7 L16.2 3.1 L19.9 2Z',
		'M32 2 V22 M25.9 2 L23 4.7 L21.5 8.3 L21 12 L21.5 15.7 L23 19.3 L25.9 22 M38.1 2 L41 4.7 L42.5 8.3 L43 12 L42.5 15.7 L41 19.3 L38.1 22 M11.7 7 H52.3 M10 12 H54 M11.7 17 H52.3',
	),
};
