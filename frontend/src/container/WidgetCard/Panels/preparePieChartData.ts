import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { isNaN } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';

export interface PieChartSlice {
	label: string;
	value: string;
	color: string;
	record: {
		queryName: string;
		legend?: string;
		/** Group-by labels, used for drilldown; absent when the slice has no group. */
		metric?: QueryData['metric'];
	};
}

interface PreparePieChartDataOptions {
	customLegendColors?: Record<string, string>;
	colorMap: Record<string, string>;
}

const colorFor = (
	label: string,
	{ customLegendColors, colorMap }: PreparePieChartDataOptions,
): string => customLegendColors?.[label] || generateColor(label, colorMap);

const isPositive = (value: string): boolean =>
	!!value && !isNaN(parseFloat(value)) && parseFloat(value) > 0;

/**
 * Time-series result: one slice per series, value = first datapoint. This is the
 * original pie behaviour — kept verbatim (same label/value/colour/record) so
 * single-value and grouped panels are unaffected.
 */
function slicesFromSeries(
	result: QueryData[],
	options: PreparePieChartDataOptions,
): PieChartSlice[] {
	return result
		.filter((d) => d?.values?.[0]?.[1] !== undefined)
		.map((d) => {
			const label = getLabelName(d.metric, d.queryName || '', d.legend || '');
			return {
				label,
				value: d.values[0][1],
				color: colorFor(label, options),
				record: d,
			};
		});
}

/**
 * V5 scalar table: one slice per (row × value column). With more than one value
 * column the column name keeps the slices distinct, so a ClickHouse query like
 * `count() AS col1, sum() AS col2` renders a slice per column instead of
 * collapsing onto the first; group-by columns become the slice label.
 */
function slicesFromTables(
	tables: QueryDataV3[],
	options: PreparePieChartDataOptions,
): PieChartSlice[] {
	const slices: PieChartSlice[] = [];

	tables.forEach((entry) => {
		const { table } = entry;
		if (!table?.columns?.length || !table?.rows?.length) {
			return;
		}

		const valueColumns = table.columns.filter((column) => column.isValueColumn);
		if (valueColumns.length === 0) {
			return;
		}
		const labelColumns = table.columns.filter((column) => !column.isValueColumn);
		const hasMultipleValueColumns = valueColumns.length > 1;

		table.rows.forEach((row) => {
			const groupLabel = labelColumns
				.map((column) => row.data[column.id || column.name])
				.filter((part) => part != null)
				.map(String)
				.join(', ');
			// Drilldown filters by group-by labels; leave it undefined when there
			// are none (e.g. a ClickHouse query) so no filterless menu is offered.
			const metric = labelColumns.length
				? labelColumns.reduce<Record<string, string>>((acc, column) => {
						acc[column.name] = String(row.data[column.id || column.name]);
						return acc;
					}, {})
				: undefined;

			valueColumns.forEach((column) => {
				let label: string;
				if (hasMultipleValueColumns) {
					label = groupLabel ? `${groupLabel} · ${column.name}` : column.name;
				} else {
					label = groupLabel || entry.legend || entry.queryName || '';
				}

				slices.push({
					label,
					value: String(row.data[column.id || column.name]),
					color: colorFor(label, options),
					record: { queryName: entry.queryName, legend: entry.legend, metric },
				});
			});
		});
	});

	return slices;
}

/**
 * Builds pie slices from a query-range payload, dropping non-positive/non-numeric
 * values.
 *
 * A scalar response with several value columns (e.g. a ClickHouse
 * `count() AS col1, sum() AS col2`) collapses to a single series in
 * `data.result` — only the first value column survives. The full data is kept in
 * the scalar table under `newResult`, so in that case slices are built from the
 * table (one per value column). Otherwise the legacy time-series result is used,
 * preserving existing behaviour for single-value and grouped panels.
 */
export function preparePieChartData(
	payload: MetricRangePayloadProps | undefined,
	options: PreparePieChartDataOptions,
): PieChartSlice[] {
	const tables = (payload?.data?.newResult?.data?.result || []).filter(
		(entry) => entry?.table?.rows?.length,
	);
	const hasMultipleValueColumns = tables.some(
		(entry) =>
			(entry.table?.columns || []).filter((column) => column.isValueColumn)
				.length > 1,
	);

	const slices = hasMultipleValueColumns
		? slicesFromTables(tables, options)
		: slicesFromSeries(payload?.data?.result || [], options);

	return slices.filter((slice) => isPositive(slice.value));
}
