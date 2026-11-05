import type { PanelKind } from '../../../Panels/types/panelKind';
import PreviewBars from './PreviewBars';
import PreviewRows, { type PreviewCell } from './PreviewRows';

import styles from './PanelTypePreview.module.scss';

// CSS var() doesn't resolve in SVG presentation attributes, so colors go via `style`.
const LINE = { stroke: 'var(--bg-robin-400)' };
const AREA_FILL = { fill: 'var(--bg-robin-500)', fillOpacity: 0.22 };
const RING_TRACK = { stroke: 'var(--l3-background)' };
const RING_PRIMARY = { stroke: 'var(--bg-robin-500)' };
const RING_SECONDARY = { stroke: 'var(--bg-robin-400)', strokeOpacity: 0.55 };

const LINE_PATH =
	'M0 34 12 26 24 30 36 16 48 22 60 10 72 18 84 8 96 14 108 5 120 11';
const AREA_PATH = 'M0 30 20 20 40 26 60 12 80 18 100 8 120 14';

const HEAD: PreviewCell = { className: styles.headCell };
const CELL: PreviewCell = { className: styles.cell };
const ACCENT: PreviewCell = { className: styles.accentCell };
const DOT: PreviewCell = { className: styles.dot };
const ACCENT_DOT: PreviewCell = { className: styles.accentDot };

const TABLE_ROWS = [
	[HEAD, HEAD, HEAD],
	[CELL, CELL, ACCENT],
	[CELL, CELL, CELL],
	[CELL, CELL, CELL],
];
const LIST_ROWS = [
	[ACCENT_DOT, CELL],
	[DOT, CELL],
	[DOT, CELL],
	[DOT, CELL],
];
// Column-major cell intensities (0–1) for the heatmap sketch, 6 columns × 4 rows.
const HEATMAP_CELLS = [
	[0.2, 0.5, 0.9, 0.4],
	[0.3, 0.7, 1, 0.5],
	[0.15, 0.45, 0.8, 0.6],
	[0.25, 0.6, 0.95, 0.35],
	[0.4, 0.85, 0.7, 0.2],
	[0.3, 0.65, 0.9, 0.45],
];
const TEXT_ROWS = [45, 100, 92, 64].map((width, i) => [
	{ ...(i === 0 ? HEAD : CELL), width },
]);

/** Decorative mini-chart per panel kind; total so a new kind needs a sketch. */
export const PANEL_TYPE_PREVIEWS: Record<PanelKind, JSX.Element> = {
	'signoz/TimeSeriesPanel': (
		<svg viewBox="0 0 120 44" preserveAspectRatio="none" className={styles.svg}>
			<path
				d={LINE_PATH}
				fill="none"
				strokeWidth={1.6}
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
				style={LINE}
			/>
		</svg>
	),
	'signoz/AreaChartPanel': (
		<svg viewBox="0 0 120 44" preserveAspectRatio="none" className={styles.svg}>
			<path d={`${AREA_PATH}V44H0Z`} style={AREA_FILL} />
			<path
				d={AREA_PATH}
				fill="none"
				strokeWidth={1.6}
				vectorEffect="non-scaling-stroke"
				style={LINE}
			/>
		</svg>
	),
	'signoz/BarChartPanel': (
		<PreviewBars heights={[80, 58, 44, 30, 18]} fade className={styles.bars} />
	),
	'signoz/HistogramPanel': (
		<PreviewBars
			heights={[14, 26, 52, 88, 100, 70, 40, 20, 10]}
			fade={false}
			className={styles.histogram}
		/>
	),
	'signoz/HeatmapPanel': (
		<svg viewBox="0 0 120 44" preserveAspectRatio="none" className={styles.svg}>
			{HEATMAP_CELLS.map((column, x) =>
				column.map((intensity, y) => (
					<rect
						// eslint-disable-next-line react/no-array-index-key
						key={`${x}-${y}`}
						x={x * 20 + 1}
						y={y * 11 + 1}
						width={18}
						height={9}
						rx={1.5}
						style={{ fill: 'var(--bg-robin-500)', fillOpacity: intensity }}
					/>
				)),
			)}
		</svg>
	),
	'signoz/PieChartPanel': (
		<svg viewBox="0 0 44 44" className={styles.svg}>
			<circle
				cx="22"
				cy="22"
				r="16"
				fill="none"
				strokeWidth={8}
				style={RING_TRACK}
			/>
			<circle
				cx="22"
				cy="22"
				r="16"
				fill="none"
				strokeWidth={8}
				strokeDasharray="50 100.5"
				transform="rotate(-90 22 22)"
				style={RING_PRIMARY}
			/>
			<circle
				cx="22"
				cy="22"
				r="16"
				fill="none"
				strokeWidth={8}
				strokeDasharray="28 100.5"
				strokeDashoffset={-50}
				transform="rotate(-90 22 22)"
				style={RING_SECONDARY}
			/>
		</svg>
	),
	'signoz/NumberPanel': (
		<div className={styles.number}>
			<span className={styles.numberValue}>
				99.7<span className={styles.numberUnit}>%</span>
			</span>
			<span className={styles.numberLabel}>Availability</span>
		</div>
	),
	'signoz/TablePanel': (
		<PreviewRows rows={TABLE_ROWS} rowClassName={styles.tableRow} />
	),
	'signoz/ListPanel': (
		<PreviewRows rows={LIST_ROWS} rowClassName={styles.listRow} />
	),
	'signoz/TextPanel': <PreviewRows rows={TEXT_ROWS} />,
};
