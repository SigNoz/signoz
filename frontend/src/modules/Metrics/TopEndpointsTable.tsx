import React from 'react';
import { Table, Button, Tooltip } from 'antd';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { useHistory, useParams } from 'react-router-dom';
import { topEndpointListItem } from '../../store/actions/MetricsActions';
import { METRICS_PAGE_QUERY_PARAM } from 'Src/constants/query';
import { GlobalTime } from 'Src/store/actions';
import { StoreState } from 'Src/store/reducers';
import './TopEndpointsTable.css';

const Wrapper = styled.div`
	padding-top: 10px;
	padding-bottom: 10px;
	padding-left: 8px;
	padding-right: 8px;
	@media only screen and (max-width: 767px) {
		padding: 0;
	}
	.ant-table table {
		font-size: 12px;
	}
	.ant-table tfoot > tr > td,
	.ant-table tfoot > tr > th,
	.ant-table-tbody > tr > td,
	.ant-table-thead > tr > th {
		padding: 10px;
	}
	.ant-table-column-sorters {
		padding: 6px;
	}
`;

interface TopEndpointsTableProps {
	data: topEndpointListItem[];
	globalTime: GlobalTime;
}

const _TopEndpointsTable = (props: TopEndpointsTableProps) => {
	const history = useHistory();
	const params = useParams<{ servicename: string }>();
	const handleOnClick = (operation: string) => {
		const urlParams = new URLSearchParams();
		const { servicename } = params;
		const { maxTime, minTime } = props.globalTime;
		urlParams.set(
			METRICS_PAGE_QUERY_PARAM.startTime,
			String(Number(minTime) / 1000000),
		);
		urlParams.set(
			METRICS_PAGE_QUERY_PARAM.endTime,
			String(Number(maxTime) / 1000000),
		);
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}
		urlParams.set(METRICS_PAGE_QUERY_PARAM.operation, operation);
		history.push(`/traces?${urlParams.toString()}`);
	};

	const columns: any = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',

			render: (text: string) => (
				<Tooltip placement="topLeft" title={text}>
					<Button
						className="topEndpointsButton"
						type="link"
						onClick={() => handleOnClick(text)}
					>
						{text}
					</Button>
				</Tooltip>
			),
		},
		{
			title: 'P50  (in ms)',
			dataIndex: 'p50',
			key: 'p50',
			sorter: (a: any, b: any) => a.p50 - b.p50,
			// sortDirections: ['descend', 'ascend'],
			render: (value: number) => (value / 1000000).toFixed(2),
		},
		{
			title: 'P95  (in ms)',
			dataIndex: 'p95',
			key: 'p95',
			sorter: (a: any, b: any) => a.p95 - b.p95,
			// sortDirections: ['descend', 'ascend'],
			render: (value: number) => (value / 1000000).toFixed(2),
		},
		{
			title: 'P99  (in ms)',
			dataIndex: 'p99',
			key: 'p99',
			sorter: (a: any, b: any) => a.p99 - b.p99,
			// sortDirections: ['descend', 'ascend'],
			render: (value: number) => (value / 1000000).toFixed(2),
		},
		{
			title: 'Number of Calls',
			dataIndex: 'numCalls',
			key: 'numCalls',
			sorter: (a: any, b: any) => a.numCalls - b.numCalls,
		},
	];

	return (
		<Wrapper>
			<h6> Top Endpoints</h6>
			<Table dataSource={props.data} columns={columns} pagination={false} />
		</Wrapper>
	);
};

const mapStateToProps = (
	state: StoreState,
): {
	globalTime: GlobalTime;
} => {
	return { globalTime: state.globalTime };
};

export const TopEndpointsTable = connect(
	mapStateToProps,
	null,
)(_TopEndpointsTable);

export default TopEndpointsTable;
