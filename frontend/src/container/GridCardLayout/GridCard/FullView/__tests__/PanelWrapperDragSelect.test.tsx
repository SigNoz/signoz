/* eslint-disable sonarjs/no-duplicate-string */

import { PANEL_TYPES } from 'constants/queryBuilder';
import PanelWrapper from 'container/PanelWrapper/PanelWrapper';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { MutableRefObject } from 'react';
import { render, screen, waitFor } from 'tests/test-utils';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

// Mock dependencies
jest.mock('container/PanelWrapper/constants', () => ({
	PanelTypeVsPanelWrapper: {
		[PANEL_TYPES.TIME_SERIES]: ({
			onDragSelect,
		}: {
			onDragSelect: (start: number, end: number) => void;
		}): JSX.Element => {
			const handleCanvasMouseDown = (): void => {
				// Simulate drag start
				const handleMouseMove = (): void => {
					// Simulate drag progress
				};

				const handleMouseUp = (): void => {
					// Simulate drag end and call onDragSelect
					onDragSelect(1634325650, 1634325750);
					document.removeEventListener('mousemove', handleMouseMove);
					document.removeEventListener('mouseup', handleMouseUp);
				};

				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('mouseup', handleMouseUp);
			};

			return (
				<div data-testid="mock-time-series-panel">
					<canvas
						data-testid="uplot-canvas"
						width={400}
						height={300}
						onMouseDown={handleCanvasMouseDown}
					/>
					<button
						type="button"
						data-testid="drag-select-trigger"
						onClick={(): void => onDragSelect(1634325650, 1634325750)}
					>
						Trigger Drag Select
					</button>
				</div>
			);
		},
	},
}));

// Mock data
const mockWidget: Widgets = {
	id: 'test-widget-id',
	query: {
		builder: {
			queryData: [
				{
					dataSource: DataSource.METRICS,
					queryName: 'A',
					aggregateOperator: 'sum',
					aggregateAttribute: {
						key: 'test',
						dataType: DataTypes.Float64,
						type: '',
					},
					functions: [],
					groupBy: [],
					expression: 'A',
					disabled: false,
					having: [],
					limit: null,
					orderBy: [],
					stepInterval: 60,
					legend: '',
					spaceAggregation: 'sum',
					timeAggregation: 'sum',
				},
			],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		promql: [],
		clickhouse_sql: [],
		id: 'test-query-id',
		queryType: EQueryType.QUERY_BUILDER,
	},
	panelTypes: PANEL_TYPES.TIME_SERIES,
	title: 'Test Widget',
	description: '',
	opacity: '',
	timePreferance: 'GLOBAL_TIME',
	nullZeroValues: '',
	yAxisUnit: '',
	fillSpans: false,
	softMin: null,
	softMax: null,
	selectedLogFields: [],
	selectedTracesFields: [],
};

// Mock response data
const mockQueryResponse: any = {
	data: {
		payload: {
			data: {
				result: [
					{
						metric: { __name__: 'test_metric' },
						values: [[1634325600, '42']],
						queryName: 'A',
					},
				],
				resultType: '',
				newResult: {
					data: {
						resultType: '',
						result: [
							{
								queryName: 'A',
								series: null,
								list: null,
							},
						],
					},
				},
			},
		},
		statusCode: 200,
		message: 'success',
		error: null,
	},
	isLoading: false,
	isError: false,
	error: null,
	isFetching: false,
	refetch: jest.fn(),
};

describe('PanelWrapper with DragSelect', () => {
	const tableProcessedDataRef = { current: [] } as MutableRefObject<RowData[]>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('simulates drag select on uPlot canvas', async () => {
		const mockOnDragSelect = jest.fn();

		render(
			<PanelWrapper
				widget={mockWidget}
				queryResponse={mockQueryResponse}
				onDragSelect={mockOnDragSelect}
				selectedGraph={PANEL_TYPES.TIME_SERIES}
				tableProcessedDataRef={tableProcessedDataRef}
			/>,
		);

		// Verify the panel renders
		expect(screen.getByTestId('mock-time-series-panel')).toBeInTheDocument();

		// Find the canvas element
		const canvas = screen.getByTestId('uplot-canvas');
		expect(canvas).toBeInTheDocument();

		// Simulate drag events on the canvas
		// Start drag by dispatching mousedown
		canvas.dispatchEvent(
			new MouseEvent('mousedown', {
				clientX: 10,
				clientY: 10,
				bubbles: true,
			}),
		);

		// Simulate mouse move during drag
		canvas.dispatchEvent(
			new MouseEvent('mousemove', {
				clientX: 60,
				clientY: 60,
				bubbles: true,
			}),
		);

		// End drag by dispatching mouseup
		canvas.dispatchEvent(
			new MouseEvent('mouseup', {
				clientX: 80,
				clientY: 80,
				bubbles: true,
			}),
		);

		// Wait for the onDragSelect to be called
		await waitFor(() => {
			expect(mockOnDragSelect).toHaveBeenCalledWith(1634325650, 1634325750);
		});
	});
});
