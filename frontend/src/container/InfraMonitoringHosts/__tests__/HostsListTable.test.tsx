/* eslint-disable react/jsx-props-no-spreading */
import { render, screen } from '@testing-library/react';
import { HostData, HostListResponse } from 'api/infraMonitoring/getHostLists';
import { SuccessResponse } from 'types/api';

import HostsListTable from '../HostsListTable';
import { HostsListTableProps } from '../utils';

const EMPTY_STATE_CONTAINER_CLASS = '.hosts-empty-state-container';

const createMockHost = (): HostData =>
	({
		hostName: 'test-host-1',
		active: true,
		cpu: 0.75,
		memory: 0.65,
		wait: 0.03,
		load15: 1.5,
		os: 'linux',
		cpuTimeSeries: { labels: {}, labelsArray: [], values: [] },
		memoryTimeSeries: { labels: {}, labelsArray: [], values: [] },
		waitTimeSeries: { labels: {}, labelsArray: [], values: [] },
		load15TimeSeries: { labels: {}, labelsArray: [], values: [] },
	} as HostData);

const createMockTableData = (
	overrides: Partial<HostListResponse['data']> = {},
): SuccessResponse<HostListResponse> => {
	const mockHost = createMockHost();
	return {
		statusCode: 200,
		message: 'Success',
		error: null,
		payload: {
			status: 'success',
			data: {
				type: 'list',
				records: [mockHost],
				groups: null,
				total: 1,
				sentAnyHostMetricsData: true,
				isSendingK8SAgentMetrics: false,
				...overrides,
			},
		},
	};
};

describe('HostsListTable', () => {
	const mockHost = createMockHost();
	const mockTableData = createMockTableData();

	const mockOnHostClick = jest.fn();
	const mockSetCurrentPage = jest.fn();
	const mockSetOrderBy = jest.fn();
	const mockSetPageSize = jest.fn();

	const mockProps: HostsListTableProps = {
		isLoading: false,
		isError: false,
		isFetching: false,
		tableData: mockTableData,
		hostMetricsData: [mockHost],
		filters: {
			items: [],
			op: 'AND',
		},
		onHostClick: mockOnHostClick,
		currentPage: 1,
		setCurrentPage: mockSetCurrentPage,
		pageSize: 10,
		setOrderBy: mockSetOrderBy,
		setPageSize: mockSetPageSize,
	};

	it('renders loading state if isLoading is true and tableData is empty', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				isLoading
				hostMetricsData={[]}
				tableData={createMockTableData({ records: [] })}
			/>,
		);
		expect(container.querySelector('.hosts-list-loading-state')).toBeTruthy();
	});

	it('renders loading state if isFetching is true and tableData is empty', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				isFetching
				hostMetricsData={[]}
				tableData={createMockTableData({ records: [] })}
			/>,
		);
		expect(container.querySelector('.hosts-list-loading-state')).toBeTruthy();
	});

	it('renders error state if isError is true', () => {
		render(<HostsListTable {...mockProps} isError />);
		expect(screen.getByText('Something went wrong')).toBeTruthy();
	});

	it('renders empty state if no hosts are found', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				hostMetricsData={[]}
				tableData={createMockTableData({
					records: [],
					noRecordsInSelectedTimeRangeAndFilters: true,
				})}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
	});

	it('renders empty state if sentAnyHostMetricsData is false', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				hostMetricsData={[]}
				tableData={createMockTableData({
					sentAnyHostMetricsData: false,
					records: [],
				})}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
	});

	it('renders empty state if isSendingK8SAgentMetrics is true', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				hostMetricsData={[]}
				tableData={createMockTableData({
					isSendingK8SAgentMetrics: true,
					records: [],
				})}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
	});

	it('renders end time before retention message when endTimeBeforeRetention is true', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				hostMetricsData={[]}
				tableData={createMockTableData({
					sentAnyHostMetricsData: true,
					isSendingK8SAgentMetrics: false,
					endTimeBeforeRetention: true,
					records: [],
				})}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
		expect(
			screen.getByText(
				/Your requested end time is earlier than the earliest time of retention/,
			),
		).toBeInTheDocument();
	});

	it('renders no records message when noRecordsInSelectedTimeRangeAndFilters is true', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				hostMetricsData={[]}
				tableData={createMockTableData({
					sentAnyHostMetricsData: true,
					isSendingK8SAgentMetrics: false,
					noRecordsInSelectedTimeRangeAndFilters: true,
					records: [],
				})}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
		expect(
			screen.getByText(/No host metrics in the selected time range and filters/),
		).toBeInTheDocument();
	});

	it('renders table data', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				tableData={createMockTableData({
					isSendingK8SAgentMetrics: false,
					sentAnyHostMetricsData: true,
				})}
			/>,
		);
		expect(container.querySelector('.hosts-list-table')).toBeTruthy();
	});
});
