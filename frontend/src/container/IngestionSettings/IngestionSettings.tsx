import './IngestionSettings.styles.scss';

import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface DataType {
	key: string;
	name: string;
	value: string;
}

export default function IngestionSettings(): JSX.Element {
	const columns: ColumnsType<DataType> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text): JSX.Element => <Typography.Text> {text} </Typography.Text>,
		},
		{
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
			render: (text): JSX.Element => (
				<Typography.Text copyable>{text}</Typography.Text>
			),
		},
	];

	const data: DataType[] = [
		{
			key: '1',
			name: 'Ingestion URL',
			value: '',
		},
		{
			key: '2',
			name: 'Ingestion Region',
			value: '',
		},
		{
			key: '3',
			name: 'Ingestion Key',
			value: '',
		},
	];

	return (
		<div className="ingestion-settings-container">
			<Typography
				style={{
					margin: '16px 0px',
				}}
			>
				You can use the following ingestion key to start sending your telemetry data
				to SigNoz
			</Typography>

			<Table
				style={{
					margin: '16px 0px',
				}}
				pagination={false}
				columns={columns}
				dataSource={data}
			/>
		</div>
	);
}
