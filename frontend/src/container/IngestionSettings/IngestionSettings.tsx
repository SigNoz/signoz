import './IngestionSettings.styles.scss';

import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import getIngestionData from 'api/settings/getIngestionData';
import { useQuery } from 'react-query';

interface DataType {
	key: string;
	name: string;
	value: string;
}

export default function IngestionSettings(): JSX.Element {
	const { data: ingestionData } = useQuery({
		queryFn: () => getIngestionData(),
	});

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
	const payload = ingestionData?.payload[0];

	const data: DataType[] = [
		{
			key: '1',
			name: 'Ingestion URL',
			value: payload?.ingestionURL,
		},
		{
			key: '2',
			name: 'Ingestion Key',
			value: payload?.ingestionKey,
		},
		{
			key: '3',
			name: 'Ingestion Region',
			value: payload?.dataRegion,
		},
	];

	return (
		<div className="ingestion-settings-container">
			<Typography
				style={{
					margin: '16px 0px',
				}}
			>
				You can use the following ingestion credentials to start sending your
				telemetry data to SigNoz
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
