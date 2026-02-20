import { render } from '@testing-library/react';
import { Y_AXIS_UNIT_NAMES } from 'components/YAxisUnitSelector/constants';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

import { getChartManagerColumns } from '../columns';
import { ExtendedChartDataset } from '../utils';

const createMockDataset = (
	index: number,
	overrides: Partial<ExtendedChartDataset> = {},
): ExtendedChartDataset =>
	({
		index,
		label: `Series ${index}`,
		show: true,
		sum: 100,
		avg: 50,
		min: 10,
		max: 90,
		stroke: '#ff0000',
		...overrides,
	} as ExtendedChartDataset);

describe('getChartManagerColumns', () => {
	const tableDataSet: ExtendedChartDataset[] = [
		createMockDataset(0, { label: 'Time' }),
		createMockDataset(1),
		createMockDataset(2),
	];
	const graphVisibilityState = [true, true, false];
	const onToggleSeriesOnOff = jest.fn();
	const onToggleSeriesVisibility = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns columns with expected structure', () => {
		const columns = getChartManagerColumns({
			tableDataSet,
			graphVisibilityState,
			onToggleSeriesOnOff,
			onToggleSeriesVisibility,
		});

		expect(columns).toHaveLength(6);
		expect(columns[0].key).toBe('index');
		expect(columns[1].key).toBe('label');
		expect(columns[2].key).toBe('avg');
		expect(columns[3].key).toBe('sum');
		expect(columns[4].key).toBe('max');
		expect(columns[5].key).toBe('min');
	});

	it('includes Label column with title', () => {
		const columns = getChartManagerColumns({
			tableDataSet,
			graphVisibilityState,
			onToggleSeriesOnOff,
			onToggleSeriesVisibility,
		});

		const labelCol = columns.find((c) => c.key === 'label');
		expect(labelCol?.title).toBe('Label');
	});

	it('formats column titles with yAxisUnit', () => {
		const columns = getChartManagerColumns({
			tableDataSet,
			graphVisibilityState,
			onToggleSeriesOnOff,
			onToggleSeriesVisibility,
			yAxisUnit: 'ms',
		});

		const avgCol = columns.find((c) => c.key === 'avg');
		expect(avgCol?.title).toBe(
			`Avg (in ${Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MILLISECONDS]})`,
		);
	});

	it('numeric column render returns formatted string with yAxisUnit', () => {
		const columns = getChartManagerColumns({
			tableDataSet,
			graphVisibilityState,
			onToggleSeriesOnOff,
			onToggleSeriesVisibility,
			yAxisUnit: 'ms',
		});

		const avgCol = columns.find((c) => c.key === 'avg');
		const renderFn = avgCol?.render as
			| ((val: number, record: ExtendedChartDataset, index: number) => string)
			| undefined;
		expect(renderFn).toBeDefined();
		const output = renderFn?.(123.45, tableDataSet[1], 1);
		expect(output).toBe('123.45 ms');
	});

	it('numeric column render formats zero when value is undefined', () => {
		const columns = getChartManagerColumns({
			tableDataSet,
			graphVisibilityState,
			onToggleSeriesOnOff,
			onToggleSeriesVisibility,
			yAxisUnit: 'none',
		});

		const sumCol = columns.find((c) => c.key === 'sum');
		const renderFn = sumCol?.render as
			| ((
					val: number | undefined,
					record: ExtendedChartDataset,
					index: number,
			  ) => string)
			| undefined;
		const output = renderFn?.(undefined, tableDataSet[1], 1);
		expect(output).toBe('0');
	});

	it('label column render displays label text and is clickable', () => {
		const columns = getChartManagerColumns({
			tableDataSet,
			graphVisibilityState,
			onToggleSeriesOnOff,
			onToggleSeriesVisibility,
		});

		const labelCol = columns.find((c) => c.key === 'label');
		const renderFn = labelCol?.render as
			| ((
					label: string,
					record: ExtendedChartDataset,
					index: number,
			  ) => JSX.Element)
			| undefined;
		expect(renderFn).toBeDefined();
		const renderResult = renderFn!('Series 1', tableDataSet[1], 1);

		const { getByRole } = render(renderResult);
		expect(getByRole('button', { name: 'Series 1' })).toBeInTheDocument();
	});

	it('index column render renders checkbox with correct checked state', () => {
		const columns = getChartManagerColumns({
			tableDataSet,
			graphVisibilityState,
			onToggleSeriesOnOff,
			onToggleSeriesVisibility,
		});

		const indexCol = columns.find((c) => c.key === 'index');
		const renderFn = indexCol?.render as
			| ((
					_val: unknown,
					record: ExtendedChartDataset,
					index: number,
			  ) => JSX.Element)
			| undefined;
		expect(renderFn).toBeDefined();
		const { container } = render(renderFn!(null, tableDataSet[1], 1));

		const checkbox = container.querySelector('input[type="checkbox"]');
		expect(checkbox).toBeInTheDocument();
		expect(checkbox).toBeChecked(); // graphVisibilityState[1] is true
	});
});
