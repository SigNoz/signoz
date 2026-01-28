import './IngestionSettings.styles.scss';

import { Skeleton, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useGetGlobalConfig } from 'hooks/globalConfig/useGetGlobalConfig';
import { useGetAllIngestionsKeys } from 'hooks/IngestionKeys/useGetAllIngestionKeys';
import { IngestionDataType } from 'types/api/settings/ingestion';

export default function IngestionSettings(): JSX.Element {
	const {
		data: globalConfig,
		isFetching: isFetchingGlobalConfig,
	} = useGetGlobalConfig();

	const {
		data: ingestionKeys,
		isFetching: isFetchingIngestionKeys,
	} = useGetAllIngestionsKeys({
		search: '',
		page: 1,
		per_page: 1,
	});

	const isFetching = isFetchingGlobalConfig || isFetchingIngestionKeys;

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

	const ingestionKey = ingestionKeys?.data?.data?.keys?.[0]?.value || '';
	const ingestionURL = globalConfig?.data?.ingestion_url || '';

	const data: IngestionDataType[] = [
		{
			key: '1',
			name: 'Ingestion URL',
			value: ingestionURL,
		},
		{
			key: '2',
			name: 'Ingestion Key',
			value: ingestionKey,
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
