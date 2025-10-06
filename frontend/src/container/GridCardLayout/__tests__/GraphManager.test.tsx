// test getGraphManagerTableColumns

import { render, screen } from 'tests/test-utils';

import GraphManager from '../GridCard/FullView/GraphManager';
import {
	getGraphManagerTableColumns,
	GetGraphManagerTableColumnsProps,
} from '../GridCard/FullView/TableRender/GraphManagerColumns';
import { GraphManagerProps } from '../GridCard/FullView/types';

// Props
const props = {
	tableDataSet: [
		{
			label: 'Timestamp',
			stroke: 'purple',
			index: 0,
			show: true,
			sum: 52791867900,
			avg: 1759728930,
			max: 1759729800,
			min: 1759728060,
		},
		{
			drawStyle: 'line',
			lineInterpolation: 'spline',
			show: true,
			label: '{service.name=""}',
			stroke: '#B33300',
			width: 2,
			spanGaps: true,
			points: {
				size: 5,
				show: false,
				stroke: '#B33300',
			},
			index: 1,
			sum: 2274.96,
			avg: 75.83,
			max: 115.76,
			min: 55.64,
		},
		{
			drawStyle: 'line',
			lineInterpolation: 'spline',
			show: true,
			label: '{service.name="recommendationservice"}',
			stroke: '#BB6BD9',
			width: 2,
			spanGaps: true,
			points: {
				size: 5,
				show: false,
				stroke: '#BB6BD9',
			},
			index: 2,
			sum: 1770.84,
			avg: 59.028,
			max: 112.16,
			min: 0,
		},
		{
			drawStyle: 'line',
			lineInterpolation: 'spline',
			show: true,
			label: '{service.name="loadgenerator"}',
			stroke: '#E9967A',
			width: 2,
			spanGaps: true,
			points: {
				size: 5,
				show: false,
				stroke: '#E9967A',
			},
			index: 3,
			sum: 1801.25,
			avg: 60.041,
			max: 94.46,
			min: 39.86,
		},
	],
	graphVisibilityState: [true, true, true, true],
	yAxisUnit: 'ops',
	isGraphDisabled: false,
} as GetGraphManagerTableColumnsProps;

describe('GraphManager', () => {
	it('should render the columns', () => {
		const columns = getGraphManagerTableColumns({
			...props,
		});
		expect(columns).toStrictEqual([
			{
				dataIndex: 'index',
				key: 'index',
				render: expect.any(Function),
				title: '',
				width: 50,
			},
			{
				dataIndex: 'label',
				key: 'label',
				render: expect.any(Function),
				title: 'Label',
				width: 300,
			},
			{
				dataIndex: 'avg',
				key: 'avg',
				render: expect.any(Function),
				title: 'Avg (in ops)',
				width: 90,
			},
			{
				dataIndex: 'sum',
				key: 'sum',
				render: expect.any(Function),
				title: 'Sum (in ops)',
				width: 90,
			},
			{
				dataIndex: 'max',
				key: 'max',
				render: expect.any(Function),
				title: 'Max (in ops)',
				width: 90,
			},
			{
				dataIndex: 'min',
				key: 'min',
				render: expect.any(Function),
				title: 'Min (in ops)',
				width: 90,
			},
		]);
	});

	it('should render graphmanager with correcting formating using y-axis', () => {
		const testProps: GraphManagerProps = {
			data: [
				[1759729380, 1759729440, 1759729500], // timestamps
				[66.167, 76.833, 83.767], // series 1
				[46.6, 52.7, 70.867], // series 2
				[45.967, 52.967, 69.933], // series 3
			],
			name: 'test-graph',
			yAxisUnit: 'ops',
			onToggleModelHandler: jest.fn(),
			setGraphsVisibilityStates: jest.fn(),
			graphsVisibilityStates: [true, true, true, true],
			lineChartRef: { current: { toggleGraph: jest.fn() } },
			parentChartRef: { current: { toggleGraph: jest.fn() } },
			options: {
				series: [
					{ label: 'Timestamp' },
					{ label: '{service.name=""}' },
					{ label: '{service.name="recommendationservice"}' },
					{ label: '{service.name="loadgenerator"}' },
				],
				width: 100,
				height: 100,
			},
		};

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<GraphManager {...testProps} />);

		// Assert that column headers include y-axis unit formatting
		expect(screen.getByText('Avg (in ops)')).toBeInTheDocument();
		expect(screen.getByText('Sum (in ops)')).toBeInTheDocument();
		expect(screen.getByText('Max (in ops)')).toBeInTheDocument();
		expect(screen.getByText('Min (in ops)')).toBeInTheDocument();

		// Assert formatting
		expect(screen.getByText('75.6 ops/s')).toBeInTheDocument();
		expect(screen.getByText('227 ops/s')).toBeInTheDocument();
		expect(screen.getByText('83.8 ops/s')).toBeInTheDocument();
		expect(screen.getByText('66.2 ops/s')).toBeInTheDocument();
	});
});
