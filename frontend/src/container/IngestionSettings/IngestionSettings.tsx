import './IngestionSettings.styles.scss';

import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import getIngestionData from 'api/settings/getIngestionData';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IngestionDataType } from 'types/api/settings/ingestion';
import AppReducer from 'types/reducer/app';

export default function IngestionSettings(): JSX.Element {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	const { data: ingestionData } = useQuery({
		queryFn: getIngestionData,
		queryKey: ['getIngestionData', user?.userId],
	});

	const columns: ColumnsType<IngestionDataType> = [
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

	const injectionDataPayload =
		ingestionData &&
		ingestionData.payload &&
		Array.isArray(ingestionData.payload) &&
		ingestionData?.payload[0];

	const data: IngestionDataType[] = [
		{
			key: '1',
			name: 'Ingestion URL',
			value: injectionDataPayload?.ingestionURL,
		},
		{
			key: '2',
			name: 'Ingestion Key',
			value: injectionDataPayload?.ingestionKey,
		},
		{
			key: '3',
			name: 'Ingestion Region',
			value: injectionDataPayload?.dataRegion,
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
