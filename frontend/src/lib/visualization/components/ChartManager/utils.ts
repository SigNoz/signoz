import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Y_AXIS_UNIT_NAMES } from 'components/YAxisUnitSelector/constants';
import uPlot from 'uplot';

/** Extended series with computed stats for table display */
export type ExtendedChartDataset = uPlot.Series & {
	show: boolean;
	sum: number;
	avg: number;
	min: number;
	max: number;
	index: number;
};

function roundToDecimalPrecision(
	value: number,
	decimalPrecision: PrecisionOption = PrecisionOptionsEnum.TWO,
): number {
	if (
		typeof value !== 'number' ||
		Number.isNaN(value) ||
		value === Infinity ||
		value === -Infinity
	) {
		return 0;
	}

	if (decimalPrecision === PrecisionOptionsEnum.FULL) {
		return value;
	}

	// regex to match the decimal precision for the given decimal precision
	const regex = new RegExp(`^-?\\d*\\.?0*\\d{0,${decimalPrecision}}`);
	const matched = value ? value.toFixed(decimalPrecision).match(regex) : null;
	return matched ? parseFloat(matched[0]) : 0;
}

/** Build table dataset from uPlot options and aligned data */
export function getDefaultTableDataSet(
	options: uPlot.Options,
	data: uPlot.AlignedData,
	decimalPrecision: PrecisionOption = PrecisionOptionsEnum.TWO,
): ExtendedChartDataset[] {
	return options.series.map(
		(series: uPlot.Series, index: number): ExtendedChartDataset => {
			const arr = (data[index] as number[]) ?? [];
			const sum = arr.reduce((a, b) => a + b, 0) || 0;
			const count = arr.length || 1;

			const hasValues = arr.length > 0;
			return {
				...series,
				index,
				show: true,
				sum: roundToDecimalPrecision(sum, decimalPrecision),
				avg: roundToDecimalPrecision(sum / count, decimalPrecision),
				max: hasValues
					? roundToDecimalPrecision(Math.max(...arr), decimalPrecision)
					: 0,
				min: hasValues
					? roundToDecimalPrecision(Math.min(...arr), decimalPrecision)
					: 0,
			};
		},
	);
}

/** Format numeric value for table display using yAxisUnit */
export function formatTableValueWithUnit(
	value: number,
	yAxisUnit?: string,
	decimalPrecision: PrecisionOption = PrecisionOptionsEnum.TWO,
): string {
	return `${getYAxisFormattedValue(
		String(value),
		yAxisUnit ?? 'none',
		decimalPrecision,
	)}`;
}

/** Format column header with optional unit */
export function getTableColumnTitle(title: string, yAxisUnit?: string): string {
	if (!yAxisUnit) {
		return title;
	}
	const universalName =
		Y_AXIS_UNIT_NAMES[yAxisUnit as keyof typeof Y_AXIS_UNIT_NAMES];
	if (!universalName) {
		return `${title} (in ${yAxisUnit})`;
	}
	return `${title} (in ${universalName})`;
}
