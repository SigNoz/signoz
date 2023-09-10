/* eslint-disable no-plusplus */
import './LogsConnectionStatus.styles.scss';

import {
	CheckCircleTwoTone,
	CloseCircleTwoTone,
	LoadingOutlined,
} from '@ant-design/icons';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useEffect, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

interface ConnectionStatusProps {
	logType: string;
	activeStep: number;
}

export default function ConnectionStatus({
	logType,
	activeStep,
}: ConnectionStatusProps): JSX.Element {
	const [loading, setLoading] = useState(true);
	const [isReceivingData, setIsReceivingData] = useState(false);

	const requestData: Query = {
		queryType: EQueryType.QUERY_BUILDER,
		panelType: PANEL_TYPES.LIST,
		builder: {
			queryData: [
				{
					dataSource: DataSource.LOGS,
					queryName: 'A',
					aggregateOperator: 'noop',
					aggregateAttribute: {
						id: '------false',
						dataType: '',
						key: '',
						isColumn: false,
						type: '',
					},
					filters: {
						items: [],
						op: 'AND',
					},
					expression: 'A',
					disabled: false,
					having: [],
					stepInterval: 60,
					limit: null,
					orderBy: [
						{
							columnName: 'timestamp',
							order: 'desc',
						},
					],
					groupBy: [],
					legend: '',
					reduceTo: 'sum',
					offset: 0,
					pageSize: 100,
				},
			],
			queryFormulas: [],
		},
	};

	const {
		data,
		isFetching,
		error,
		isError,
		refetch: fetchLogs,
	} = useGetExplorerQueryRange(requestData, PANEL_TYPES.LIST, {
		keepPreviousData: true,
	});

	const verifyApplicationData = (response): void => {
		if (data || !isError) {
			setLoading(false);
			setIsReceivingData(false);
		}
	};

	useEffect(() => {
		verifyApplicationData(data);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isFetching, data, error, isError]);

	useEffect(() => {
		fetchLogs();
	}, []);

	console.log('data', data, isError);

	return (
		<div className="connection-status-container">
			{/* <div className="full-docs-link">{renderDocsReference()}</div> */}
			<div className="status-container">
				<div className="service-info">
					<div className="label"> Logs Type </div>
					<div className="language text-capitalize"> {logType} </div>
				</div>

				<div className="status-info">
					<div className="label"> Status </div>

					<div className="status">
						{(loading || isFetching) && <LoadingOutlined />}
						{!(loading || isFetching) && isReceivingData && (
							<>
								<CheckCircleTwoTone twoToneColor="#52c41a" />
								<span> Success </span>
							</>
						)}
						{!(loading || isFetching) && !isReceivingData && (
							<>
								<CloseCircleTwoTone twoToneColor="#e84749" />
								<span> Failed </span>
							</>
						)}
					</div>
				</div>
				<div className="details-info">
					<div className="label"> Details </div>

					<div className="details">
						{(loading || isFetching) && <div> Waiting for Update </div>}
						{!(loading || isFetching) && isReceivingData && (
							<div> Received logs successfully. </div>
						)}
						{!(loading || isFetching) && !isReceivingData && (
							<div> Couldn't detect the logs </div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
