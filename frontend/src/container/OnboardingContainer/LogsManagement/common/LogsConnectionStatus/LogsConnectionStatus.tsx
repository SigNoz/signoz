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
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

interface ConnectionStatusProps {
	logType: string;
	activeStep: number;
}

const LogsTypePropertyMap = {
	kubernetes: 'k8s_pod_name',
	docker: 'container_id',
	otel: 'telemetry_sdk_language',
};

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

	const verifyLogsData = (response): void => {
		if (response || !isError) {
			setLoading(false);
		}

		const currentData = data?.payload.data.newResult.data.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));

			for (let index = 0; index < currentLogs.length; index++) {
				const log = currentLogs[index];

				if (
					(logType === 'kubernetes' && log['attributes_string']['k8s_pod_name']) ||
					(logType === 'docker' && log['attributes_string']['container_id'])
				) {
					setIsReceivingData(true);
					break;
				}
			}
		}
	};

	useEffect(() => {
		verifyLogsData(data);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isFetching, data, error, isError]);

	useEffect(() => {
		fetchLogs();
	}, []);

	const renderDocsReference = (): JSX.Element => {
		switch (logType) {
			case 'docker':
				return (
					<div className="header">
						<img
							className={'supported-logs-type-img'}
							src={`/Logos/docker.svg`}
							alt=""
						/>
						<div className="title">
							<h1>Collecting Docker container logs</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/userguide/collect_docker_logs/"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			case 'python':
				return (
					<div className="header">
						<img className="supported-language-img" src="/Logos/python.png" alt="" />

						<div className="title">
							<h1>Python OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/python/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			case 'javascript':
				return (
					<div className="header">
						<img
							className="supported-language-img"
							src="/Logos/javascript.png"
							alt=""
						/>
						<div className="title">
							<h1>Javascript OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/javascript/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			case 'go':
				return (
					<div className="header">
						<img className="supported-language-img" src="/Logos/go.png" alt="" />
						<div className="title">
							<h1>Go OpenTelemetry Instrumentation</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/golang/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			default:
				return <> </>;
		}
	};

	return (
		<div className="connection-status-container">
			<div className="full-docs-link">{renderDocsReference()}</div>
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
