/* eslint-disable react/display-name */
import { Table, Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import AlertStatus from 'container/TriggeredAlerts/TableComponents/AlertStatus';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';
import React from 'react';
import { Alerts } from 'types/api/alerts/getAll';

const NoFilterTable = ({ allAlerts }: NoFilterTableProps): JSX.Element => {
	const columns: ColumnsType<Alerts> = [
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			sorter: (a, b): number =>
				b.labels.severity.length - a.labels.severity.length,
			render: (value): JSX.Element => {
				console.log(value);
				return <AlertStatus severity={value.state} />;
			},
		},
		{
			title: 'Alert Name',
			dataIndex: 'labels',
			key: 'alertName',
			sorter: (a, b): number => a.name.length - b.name.length,
			render: (data): JSX.Element => {
				const name = data?.alertname || '';
				return <Typography>{name}</Typography>;
			},
		},
		{
			title: 'Tags',
			dataIndex: 'labels',
			key: 'tags',
			render: (labels): JSX.Element => {
				const objectKeys = Object.keys(labels);
				const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');

				if (withOutSeverityKeys.length === 0) {
					return <Typography>-</Typography>;
				}

				return (
					<>
						{withOutSeverityKeys.map((e) => {
							return <Tag key={e} color="magenta">{`${e} : ${labels[e]}`}</Tag>;
						})}
					</>
				);
			},
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			key: 'severity',
			sorter: (a, b): number => {
				const severityValueA = a.labels['severity'];
				const severityValueB = b.labels['severity'];
				return severityValueA.length - severityValueB.length;
			},
			render: (value): JSX.Element => {
				const objectKeys = Object.keys(value);
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = value[withSeverityKey];

				return <Typography>{severityValue}</Typography>;
			},
		},
		{
			title: 'Firing Since',
			dataIndex: 'startsAt',
			render: (date): JSX.Element => {
				const formatedDate = new Date(date);

				return (
					<Typography>{`${getFormattedDate(formatedDate)} ${convertDateToAmAndPm(
						formatedDate,
					)}`}</Typography>
				);
			},
		},
		// {
		// 	title: 'Actions',
		// 	dataIndex: 'fingerprint',
		// 	key: 'actions',
		// 	render: (): JSX.Element => {
		// 		return (
		// 			<div>
		// 				<Button type="link">Edit</Button>
		// 				<Button type="link">Delete</Button>
		// 				<Button type="link">Pause</Button>
		// 			</div>
		// 		);
		// 	},
		// },
	];

	return <Table rowKey="alertName" dataSource={allAlerts} columns={columns} />;
};

interface NoFilterTableProps {
	allAlerts: Alerts[];
}

export default NoFilterTable;
