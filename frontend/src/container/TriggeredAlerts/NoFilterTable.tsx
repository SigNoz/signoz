import React from 'react';

import { Alerts } from 'types/api/alerts/getAll';
import { ColumnsType } from 'antd/lib/table';
import { Button, Table, Tag, Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';

import Status from 'container/ListAlertRules/TableComponents/Status';
import getFormattedDate from 'lib/getFormatedDate';

const NoFilterTable = ({ allAlerts }: NoFilterTableProps) => {
	const columns: ColumnsType<Alerts> = [
		{
			title: 'Status',
			dataIndex: 'labels',
			key: 'status',
			sorter: (a, b) => b.labels.severity.length - a.labels.severity.length,
			render: (value: Alerts['labels']) => {
				const objectKeys = Object.keys(value);
				// const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = value[withSeverityKey];
				return (
					<Status
						{...{
							status: severityValue,
						}}
					/>
				);
			},
		},
		{
			title: 'Alert Name',
			dataIndex: 'labels',
			key: 'alertName',
			render: (data) => {
				const name = data?.alertname || '';
				return <Typography>{name}</Typography>;
			},
		},
		{
			title: 'Tags',
			dataIndex: 'labels',
			key: 'tags',
			render: (labels) => {
				const objectKeys = Object.keys(labels);
				const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');

				if (withOutSeverityKeys.length === 0) {
					return '-';
				}

				return (
					<>
						{withOutSeverityKeys.map((e) => {
							return <Tag color="magenta">{`${e} : ${labels[e]}`}</Tag>;
						})}
					</>
				);
			},
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			key: 'severity',
			render: (value) => {
				const objectKeys = Object.keys(value);
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = value[withSeverityKey];

				return <Typography>{severityValue}</Typography>;
			},
		},
		{
			title: 'Firing Since',
			dataIndex: 'startsAt',
			render: (date) => {
				const formatedDate = new Date(date);

				return (
					<Typography>{`${getFormattedDate(formatedDate)} ${convertDateToAmAndPm(
						formatedDate,
					)}`}</Typography>
				);
			},
		},
		{
			title: 'Actions',
			dataIndex: 'fingerprint',
			key: 'actions',
			render: () => {
				return (
					<div>
						<Button type="link">Edit</Button>
						<Button type="link">Delete</Button>
						<Button type="link">Pause</Button>
					</div>
				);
			},
		},
	];

	return <Table dataSource={allAlerts} columns={columns} />;
};

interface NoFilterTableProps {
	allAlerts: Alerts[];
}

export default NoFilterTable;
