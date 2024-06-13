import './ServiceTopLevelOperations.styles.scss';

import { SyncOutlined } from '@ant-design/icons';
import { Alert, Table, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { IServiceName } from 'container/MetricsApplication/Tabs/types';
import useErrorNotification from 'hooks/useErrorNotification';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { BarChart2 } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

export default function ServiceTopLevelOperations(): JSX.Element {
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const servicename = decodeURIComponent(encodedServiceName);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const [topLevelOperations, setTopLevelOperations] = useState<string[]>([]);

	const { data, error, isLoading } = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags,
	});

	useErrorNotification(error);

	useEffect(() => {
		const selectedService = data?.find(
			(service) => service.serviceName === servicename,
		);

		setTopLevelOperations(selectedService?.dataWarning?.topLevelOps || []);
	}, [servicename, data]);

	const alertDesc = (): ReactNode => (
		<div className="">
			SigNoz calculates the RED metrics for a service using the entry-point spans.
			For more details, you can check out our
			<a
				href="https://signoz.io/docs/userguide/metrics/#open-the-services-section"
				target="_blank"
				rel="noreferrer"
			>
				{' '}
				docs
			</a>
			. We expect the number of unique entry-point operations to be no more than
			2500. The high number of top level operations might be due to an
			instrumentation issue in your service. Below table shows the sample top level
			operations. Please refer to official docs for span name guidelines{' '}
			<a
				href="https://opentelemetry.io/docs/specs/otel/trace/api/#span"
				target="_blank"
				rel="noreferrer"
			>
				{' '}
				here
			</a>{' '}
			and update the instrumentation to to follow the guidelines. If there are any
			dynamic IDs in the span name, make sure to use the span attributes instead.
			If you have more questions, please reach out to us via support.
		</div>
	);

	const columns = [
		{
			title: 'Top Level Operation',
			key: 'top-level-operation',
			render: (operation: string): JSX.Element => (
				<div className="top-level-operations-list-item" key={operation}>
					<Typography.Text> {operation} </Typography.Text>
				</div>
			),
		},
	];

	return (
		<div className="container">
			<Typography.Title level={5} className="top-level-operations-header">
				<Link to={ROUTES.APPLICATION}>
					<span className="breadcrumb">
						{' '}
						<BarChart2 size={12} /> services{' '}
					</span>
				</Link>
				<div className="divider">/</div>
				<Link to={`${ROUTES.APPLICATION}/${servicename}`}>
					<span className="breadcrumb">{servicename} </span>
				</Link>
			</Typography.Title>

			<div className="info-alert">
				<Alert message={alertDesc()} type="info" showIcon />
			</div>

			{isLoading && (
				<div className="loading-top-level-operations">
					<Typography.Title level={5}>
						<SyncOutlined spin /> Loading ...
					</Typography.Title>
				</div>
			)}

			{!isLoading && (
				<div className="top-level-operations-list">
					<Table
						columns={columns}
						bordered
						title={(): string => 'Top Level Operations'}
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						dataSource={topLevelOperations}
						loading={isLoading}
						showHeader={false}
						pagination={{
							pageSize: 100,
							hideOnSinglePage: true,
							showTotal: (total: number, range: number[]): string =>
								`${range[0]}-${range[1]} of ${total}`,
						}}
					/>
				</div>
			)}
		</div>
	);
}
