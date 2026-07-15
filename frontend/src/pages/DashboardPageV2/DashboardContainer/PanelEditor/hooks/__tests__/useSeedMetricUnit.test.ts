import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';

import type { TableColumnOption } from '../useTableColumns';
import { useSeedMetricUnit } from '../useSeedMetricUnit';

jest.mock('hooks/useGetYAxisUnit', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockUseGetYAxisUnit = useGetYAxisUnit as unknown as jest.Mock;

function mockMetricUnit(
	yAxisUnit: string | undefined,
	isLoading = false,
): void {
	mockUseGetYAxisUnit.mockReturnValue({ yAxisUnit, isLoading, isError: false });
}

function makeSpec(formatting?: unknown): DashboardtypesPanelSpecDTO {
	return {
		plugin: {
			kind: 'signoz/TimeSeriesPanel',
			spec: formatting ? { formatting } : {},
		},
	} as unknown as DashboardtypesPanelSpecDTO;
}

function unit(spec: DashboardtypesPanelSpecDTO): unknown {
	return (spec.plugin.spec as { formatting?: { unit?: unknown } }).formatting
		?.unit;
}

function columnUnits(spec: DashboardtypesPanelSpecDTO): unknown {
	return (spec.plugin.spec as { formatting?: { columnUnits?: unknown } })
		.formatting?.columnUnits;
}

const COLUMNS: TableColumnOption[] = [
	{ key: 'A', label: 'A' },
	{ key: 'B', label: 'B' },
];

const NO_COLUMNS: TableColumnOption[] = [];

describe('useSeedMetricUnit', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('panel-wide unit (controls.unit)', () => {
		it('seeds formatting.unit from the metric on a new panel', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			renderHook(() =>
				useSeedMetricUnit({
					isNewPanel: true,
					formattingControls: { unit: true },
					columns: NO_COLUMNS,
					spec: makeSpec(),
					onChangeSpec,
				}),
			);

			expect(unit(onChangeSpec.mock.calls[0][0])).toBe('bytes');
		});

		it('does not seed when not a new panel', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			renderHook(() =>
				useSeedMetricUnit({
					isNewPanel: false,
					formattingControls: { unit: true },
					columns: NO_COLUMNS,
					spec: makeSpec(),
					onChangeSpec,
				}),
			);

			expect(onChangeSpec).not.toHaveBeenCalled();
		});

		it('does not seed when the unit already matches the metric', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			renderHook(() =>
				useSeedMetricUnit({
					isNewPanel: true,
					formattingControls: { unit: true },
					columns: NO_COLUMNS,
					spec: makeSpec({ unit: 'bytes' }),
					onChangeSpec,
				}),
			);

			expect(onChangeSpec).not.toHaveBeenCalled();
		});

		it('re-seeds when the resolved metric unit changes', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			const { rerender } = renderHook(
				(props: { spec: DashboardtypesPanelSpecDTO }) =>
					useSeedMetricUnit({
						isNewPanel: true,
						formattingControls: { unit: true },
						columns: NO_COLUMNS,
						spec: props.spec,
						onChangeSpec,
					}),
				{ initialProps: { spec: makeSpec() } },
			);
			expect(unit(onChangeSpec.mock.calls[0][0])).toBe('bytes');

			// Metric changes; the panel now holds the previously-seeded unit.
			mockMetricUnit('ms');
			rerender({ spec: makeSpec({ unit: 'bytes' }) });

			expect(unit(onChangeSpec.mock.calls[1][0])).toBe('ms');
		});
	});

	describe('per-column units (controls.columnUnits)', () => {
		it('seeds every value column with the metric unit once columns resolve', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			const { rerender } = renderHook(
				(props: { columns: TableColumnOption[] }) =>
					useSeedMetricUnit({
						isNewPanel: true,
						formattingControls: { columnUnits: true },
						columns: props.columns,
						spec: makeSpec(),
						onChangeSpec,
					}),
				{ initialProps: { columns: NO_COLUMNS } },
			);
			// Waits for results to resolve the columns.
			expect(onChangeSpec).not.toHaveBeenCalled();

			rerender({ columns: COLUMNS });
			expect(columnUnits(onChangeSpec.mock.calls[0][0])).toStrictEqual({
				A: 'bytes',
				B: 'bytes',
			});
		});

		it('never writes formatting.unit for a Table', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			renderHook(() =>
				useSeedMetricUnit({
					isNewPanel: true,
					formattingControls: { columnUnits: true, decimals: true },
					columns: COLUMNS,
					spec: makeSpec(),
					onChangeSpec,
				}),
			);

			expect(unit(onChangeSpec.mock.calls[0][0])).toBeUndefined();
		});

		it('only fills columns without a unit yet, keeping the user-set one', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			renderHook(() =>
				useSeedMetricUnit({
					isNewPanel: true,
					formattingControls: { columnUnits: true },
					columns: COLUMNS,
					spec: makeSpec({ columnUnits: { A: 'ms' } }),
					onChangeSpec,
				}),
			);

			expect(columnUnits(onChangeSpec.mock.calls[0][0])).toStrictEqual({
				A: 'ms',
				B: 'bytes',
			});
		});

		it('does not write when every column already has a unit', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			renderHook(() =>
				useSeedMetricUnit({
					isNewPanel: true,
					formattingControls: { columnUnits: true },
					columns: COLUMNS,
					spec: makeSpec({ columnUnits: { A: 'ms', B: 's' } }),
					onChangeSpec,
				}),
			);

			expect(onChangeSpec).not.toHaveBeenCalled();
		});

		it('seeds once and does not re-run after the metric unit changes', () => {
			mockMetricUnit('bytes');
			const onChangeSpec = jest.fn();

			const { rerender } = renderHook(
				(props: { metric: string }) => {
					mockMetricUnit(props.metric);
					return useSeedMetricUnit({
						isNewPanel: true,
						formattingControls: { columnUnits: true },
						columns: COLUMNS,
						spec: makeSpec(),
						onChangeSpec,
					});
				},
				{ initialProps: { metric: 'bytes' } },
			);
			expect(onChangeSpec).toHaveBeenCalledTimes(1);

			rerender({ metric: 'ms' });
			expect(onChangeSpec).toHaveBeenCalledTimes(1);
		});
	});

	it('seeds nothing when the kind has no unit control (Histogram/List)', () => {
		mockMetricUnit('bytes');
		const onChangeSpec = jest.fn();

		renderHook(() =>
			useSeedMetricUnit({
				isNewPanel: true,
				formattingControls: undefined,
				columns: COLUMNS,
				spec: makeSpec(),
				onChangeSpec,
			}),
		);

		expect(onChangeSpec).not.toHaveBeenCalled();
	});

	it('returns the resolved metric unit and loading state', () => {
		mockMetricUnit('bytes', true);

		const { result } = renderHook(() =>
			useSeedMetricUnit({
				isNewPanel: false,
				formattingControls: { unit: true },
				columns: NO_COLUMNS,
				spec: makeSpec(),
				onChangeSpec: jest.fn(),
			}),
		);

		expect(result.current.metricUnit).toBe('bytes');
		expect(result.current.isLoading).toBe(true);
	});
});
