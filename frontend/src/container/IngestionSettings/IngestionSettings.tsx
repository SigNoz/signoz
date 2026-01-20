import './IngestionSettings.styles.scss';

import { Skeleton, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import getIngestionData from 'api/settings/getIngestionData';
import { useAppContext } from 'providers/App/App';
import { useQuery } from 'react-query';
import { IngestionDataType } from 'types/api/settings/ingestion';

export default function IngestionSettings(): JSX.Element {
	const { user } = useAppContext();

	const { data: ingestionData, isFetching } = useQuery({
		queryFn: getIngestionData,
		queryKey: ['getIngestionData', user?.id],
	});

	const columns: ColumnsType<IngestionDataType> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text): JSX.Element => <Typography.Text> {text} </Typography.Text>,
		},
		{
			title: '',
			dataIndex: 'value',
			key: 'value',
			render: (text): JSX.Element => (
				<div>
					{isFetching ? (
						<Skeleton.Input active style={{ height: 20 }} />
					) : (
						<Typography.Text copyable={!isFetching && text !== ''}>
							{text}
						</Typography.Text>
					)}
				</div>
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
				bordered
			/>
		</div>
	);
}
