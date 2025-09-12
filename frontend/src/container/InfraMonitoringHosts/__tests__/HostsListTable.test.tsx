/* eslint-disable react/jsx-props-no-spreading */
import { render, screen } from '@testing-library/react';

import HostsListTable from '../HostsListTable';

const EMPTY_STATE_CONTAINER_CLASS = '.hosts-empty-state-container';

describe('HostsListTable', () => {
	const mockHost = {
		hostName: 'test-host-1',
		active: true,
		cpu: 0.75,
		memory: 0.65,
		wait: 0.03,
		load15: 1.5,
		os: 'linux',
	};

	const mockTableData = {
		payload: {
			data: {
				hosts: [mockHost],
			},
		},
	};
	const mockOnHostClick = jest.fn();
	const mockSetCurrentPage = jest.fn();
	const mockSetOrderBy = jest.fn();
	const mockSetPageSize = jest.fn();
	const mockProps = {
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
	} as any;

	it('renders loading state if isLoading is true and tableData is empty', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				isLoading
				hostMetricsData={[]}
				tableData={{ payload: { data: { hosts: [] } } }}
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
				tableData={{ payload: { data: { hosts: [] } } }}
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
				tableData={{
					payload: {
						data: { hosts: [] },
					},
				}}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
	});

	it('renders empty state if sentAnyHostMetricsData is false', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				hostMetricsData={[]}
				tableData={{
					...mockTableData,
					payload: {
						...mockTableData.payload,
						data: {
							...mockTableData.payload.data,
							sentAnyHostMetricsData: false,
							hosts: [],
						},
					},
				}}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
	});

	it('renders empty state if isSendingIncorrectK8SAgentMetrics is true', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				hostMetricsData={[]}
				tableData={{
					...mockTableData,
					payload: {
						...mockTableData.payload,
						data: {
							...mockTableData.payload.data,
							isSendingIncorrectK8SAgentMetrics: true,
							hosts: [],
						},
					},
				}}
			/>,
		);
		expect(container.querySelector(EMPTY_STATE_CONTAINER_CLASS)).toBeTruthy();
	});

	it('renders table data', () => {
		const { container } = render(
			<HostsListTable
				{...mockProps}
				tableData={{
					...mockTableData,
					payload: {
						...mockTableData.payload,
						data: {
							...mockTableData.payload.data,
							isSendingIncorrectK8SAgentMetrics: false,
							sentAnyHostMetricsData: true,
						},
					},
				}}
			/>,
		);
		expect(container.querySelector('.hosts-list-table')).toBeTruthy();
	});
});
