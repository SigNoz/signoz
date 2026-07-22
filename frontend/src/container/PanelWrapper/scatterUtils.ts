import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';

export interface ScatterPoint {
	x: number;
	y: number;
	label: string;
	color: string;
}

export interface ScatterData {
	points: ScatterPoint[];
	/** queryName whose value is plotted on the X axis (first query) */
	xQueryName: string;
	/** queryName whose value is plotted on the Y axis (second query) */
	yQueryName: string;
}

/**
 * Builds a stable identity key for a series from its group-by labels.
 * Intrinsic labels wrapped in double underscores (e.g. `__name__`) differ
 * across queries, so they are excluded — only user-selected group-by labels
 * are used to match a point's X value (query A) with its Y value (query B).
 */
export const getMetricKey = (metric: QueryData['metric']): string =>
	Object.keys(metric || {})
		.filter((key) => !/^__.*__$/.test(key))
		.sort()
		.map((key) => `${key}=${metric[key]}`)
		.join(',');

/**
 * Lists the non-disabled query/formula names eligible to back a scatter axis,
 * preserving the order they appear in the query builder.
 */
export const getScatterQueryNames = (query?: Query): string[] => {
	if (!query) {
		return [];
	}
	const names: string[] = [];
	query.builder?.queryData?.forEach((q) => {
		if (!q.disabled) {
			names.push(q.queryName);
		}
	});
	query.builder?.queryFormulas?.forEach((f) => {
		if (!f.disabled) {
			names.push(f.queryName);
		}
	});
	query.clickhouse_sql?.forEach((q) => {
		if (!q.disabled) {
			names.push(q.name);
		}
	});
	return names;
};

/**
 * Pairs the scalar results of two queries into (x, y) points, matched by their
 * group-by labels. The X and Y queries can be selected explicitly via
 * `preferredXQuery` / `preferredYQuery`; when a preference is missing from the
 * data it falls back to the first/second query by order of appearance.
 */
export const prepareScatterData = ({
	panelData,
	customLegendColors,
	isDarkMode,
	preferredXQuery,
	preferredYQuery,
}: {
	panelData: QueryData[];
	customLegendColors?: Record<string, string>;
	isDarkMode: boolean;
	preferredXQuery?: string;
	preferredYQuery?: string;
}): ScatterData => {
	const queryNames: string[] = [];
	panelData.forEach((d) => {
		if (d.queryName && !queryNames.includes(d.queryName)) {
			queryNames.push(d.queryName);
		}
	});

	const isPresent = (name?: string): boolean =>
		!!name && queryNames.includes(name);

	const fallbackForX = queryNames[0] ?? '';
	const xQueryName = isPresent(preferredXQuery)
		? (preferredXQuery as string)
		: fallbackForX;
	// keep Y distinct from X when falling back to order-based selection
	const fallbackForY = queryNames.find((name) => name !== xQueryName) ?? '';
	const yQueryName = isPresent(preferredYQuery)
		? (preferredYQuery as string)
		: fallbackForY;

	if (!xQueryName || !yQueryName || xQueryName === yQueryName) {
		return { points: [], xQueryName, yQueryName };
	}

	const parseValue = (d: QueryData): number => {
		const raw = d?.values?.[0]?.[1];
		return raw === undefined ? NaN : parseFloat(raw);
	};

	const xMap = new Map<
		string,
		{ value: number; metric: QueryData['metric']; legend: string }
	>();
	const yMap = new Map<string, number>();

	panelData.forEach((d) => {
		const value = parseValue(d);
		if (Number.isNaN(value)) {
			return;
		}
		const key = getMetricKey(d.metric);
		if (d.queryName === xQueryName) {
			xMap.set(key, { value, metric: d.metric, legend: d.legend || '' });
		} else if (d.queryName === yQueryName) {
			yMap.set(key, value);
		}
	});

	const points: ScatterPoint[] = [];
	xMap.forEach((xEntry, key) => {
		if (!yMap.has(key)) {
			return;
		}
		const y = yMap.get(key) as number;
		const baseLabel = getLabelName(xEntry.metric, '', xEntry.legend);
		const label = baseLabel || `${xQueryName} vs ${yQueryName}`;
		const color =
			customLegendColors?.[label] ||
			generateColor(
				label,
				isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
			);
		points.push({ x: xEntry.value, y, label, color });
	});

	return { points, xQueryName, yQueryName };
};

/**
 * Rounds a range bound to a "nice" number for axis ticks.
 * Mirrors the classic Heckbert nice-number algorithm.
 */
const niceNum = (range: number, round: boolean): number => {
	const exponent = Math.floor(Math.log10(range));
	const fraction = range / 10 ** exponent;
	let niceFraction: number;
	if (round) {
		if (fraction < 1.5) {
			niceFraction = 1;
		} else if (fraction < 3) {
			niceFraction = 2;
		} else if (fraction < 7) {
			niceFraction = 5;
		} else {
			niceFraction = 10;
		}
	} else if (fraction <= 1) {
		niceFraction = 1;
	} else if (fraction <= 2) {
		niceFraction = 2;
	} else if (fraction <= 5) {
		niceFraction = 5;
	} else {
		niceFraction = 10;
	}
	return niceFraction * 10 ** exponent;
};

export interface AxisScale {
	min: number;
	max: number;
	ticks: number[];
	/** maps a data value to a 0..1 fraction of the axis */
	normalize: (value: number) => number;
}

/**
 * Computes a padded, nicely-ticked linear scale for one axis.
 */
export const computeAxisScale = (
	values: number[],
	tickCount = 5,
): AxisScale => {
	let min = Math.min(...values);
	let max = Math.max(...values);

	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		min = 0;
		max = 1;
	}

	if (min === max) {
		// flat data: pad around the single value so the point is centered
		const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.5 : 1;
		min -= pad;
		max += pad;
	}

	const range = niceNum(max - min, false);
	const spacing = niceNum(range / (tickCount - 1), true);
	const niceMin = Math.floor(min / spacing) * spacing;
	const niceMax = Math.ceil(max / spacing) * spacing;

	const ticks: number[] = [];
	for (let tick = niceMin; tick <= niceMax + spacing / 2; tick += spacing) {
		ticks.push(tick);
	}

	const span = niceMax - niceMin || 1;
	return {
		min: niceMin,
		max: niceMax,
		ticks,
		normalize: (value: number): number => (value - niceMin) / span,
	};
};
