import React from "react";
import { NavLink } from "react-router-dom";
import { Table } from "antd";
import styled from "styled-components";
import { topEndpointListItem } from "../../store/actions/metrics";

const Wrapper = styled.div`
	padding-top: 10px;
	padding-bottom: 10px;
	padding-left: 20px;
	padding-right: 20px;
	.ant-table table {
		font-size: 12px;
	}
	.ant-table tfoot > tr > td,
	.ant-table tfoot > tr > th,
	.ant-table-tbody > tr > td,
	.ant-table-thead > tr > th {
		padding: 10px;
	}
`;

interface TopEndpointsTableProps {
	data: topEndpointListItem[];
}

const TopEndpointsTable = (props: TopEndpointsTableProps) => {
	const columns: any = [
		{
			title: "Name",
			dataIndex: "name",
			key: "name",

			render: (text: string) => <NavLink to={"/" + text}>{text}</NavLink>,
		},
		{
			title: "P50  (in ms)",
			dataIndex: "p50",
			key: "p50",
			sorter: (a: any, b: any) => a.p50 - b.p50,
			// sortDirections: ['descend', 'ascend'],
			render: (value: number) => (value / 1000000).toFixed(2),
		},
		{
			title: "P90  (in ms)",
			dataIndex: "p90",
			key: "p90",
			sorter: (a: any, b: any) => a.p90 - b.p90,
			// sortDirections: ['descend', 'ascend'],
			render: (value: number) => (value / 1000000).toFixed(2),
		},
		{
			title: "P99  (in ms)",
			dataIndex: "p99",
			key: "p99",
			sorter: (a: any, b: any) => a.p99 - b.p99,
			// sortDirections: ['descend', 'ascend'],
			render: (value: number) => (value / 1000000).toFixed(2),
		},
		{
			title: "Number of Calls",
			dataIndex: "numCalls",
			key: "numCalls",
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

export default TopEndpointsTable;
