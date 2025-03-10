import { Button, Skeleton, Table } from 'antd';
import { ENTITY_VERSION_V4 } from 'constants/app';
import {
	getQueryRangeRequestData,
	getServiceListFromQuery,
} from 'container/ServiceApplication/utils';
import { useGetQueriesRange } from 'hooks/queryBuilder/useGetQueriesRange';
import useGetTopLevelOperations from 'hooks/useGetTopLevelOperations';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useMemo, useState } from 'react';
import { QueryKey } from 'react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

import { columns } from './constants';

function ServiceMetrics(): JSX.Element {
	const { maxTime, minTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const [isError, setIsError] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const queryKey: QueryKey = [
		minTime,
		maxTime,
		selectedTags,
		globalSelectedInterval,
	];
	const {
		data,
		isLoading: isLoadingTopLevelOperations,
		isError: isErrorTopLevelOperations,
	} = useGetTopLevelOperations(queryKey, {
		start: minTime,
		end: maxTime,
	});

	console.log('isLoadingTopLevelOperations', isLoadingTopLevelOperations);
	console.log('isErrorTopLevelOperations', isErrorTopLevelOperations);

	const topLevelOperations = Object.entries(data || {});

	const queryRangeRequestData = useMemo(
		() =>
			getQueryRangeRequestData({
				topLevelOperations,
				minTime,
				maxTime,
				globalSelectedInterval,
			}),
		[globalSelectedInterval, maxTime, minTime, topLevelOperations],
	);

	const dataQueries = useGetQueriesRange(
		queryRangeRequestData,
		ENTITY_VERSION_V4,
		{
			queryKey: [
				`GetMetricsQueryRange-home-${globalSelectedInterval}`,
				maxTime,
				minTime,
				globalSelectedInterval,
			],
			keepPreviousData: true,
			enabled: true,
			refetchOnMount: false,
			onError: (error) => {
				setIsError(true);
				setError(error);
			},
		},
	);

	const isLoading = dataQueries.some((query) => query.isLoading);

	const services: ServicesList[] = useMemo(
		() =>
			getServiceListFromQuery({
				queries: dataQueries,
				topLevelOperations,
				isLoading,
			}),

		[isLoading, dataQueries, topLevelOperations],
	);

	const servicesExist = services?.length > 0;
	const top5Services = services?.slice(0, 5);

	console.log('services', services, isLoading);

	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/triangle-ruler.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>

					<div className="empty-title">You are not sending traces yet.</div>

					<div className="empty-description">
						Start sending traces to see your services.
					</div>
				</div>

				<div className="empty-actions-container">
					<Button type="default" className="periscope-btn secondary">
						Get Started &nbsp; <ArrowRight size={16} />
					</Button>

					<Button type="link" className="learn-more-link">
						Learn more <ArrowUpRight size={12} />
					</Button>
				</div>
			</div>
		</div>
	);

	const renderDashboardsList = (): JSX.Element => (
		<div className="services-list-container home-data-item-container">
			<div className="services-list">
				<Table<ServicesList>
					columns={columns}
					dataSource={top5Services}
					pagination={false}
					className="services-table"
				/>
			</div>
		</div>
	);

	if (isLoadingTopLevelOperations || isLoading) {
		<Card className="dashboards-list-card home-data-card">
			<Card.Content>
				<Skeleton active />
			</Card.Content>
		</Card>;
	}

	if (isErrorTopLevelOperations || isError) {
		return (
			<Card className="dashboards-list-card home-data-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	console.log('error', error);

	return (
		<Card className="dashboards-list-card home-data-card">
			{servicesExist && (
				<Card.Header>
					<div className="services-header home-data-card-header"> Services </div>
				</Card.Header>
			)}
			<Card.Content>
				{servicesExist ? renderDashboardsList() : emptyStateCard()}
			</Card.Content>

			{servicesExist && (
				<Card.Footer>
					<div className="services-footer home-data-card-footer">
						<Link to="/services">
							<Button type="link" className="periscope-btn link learn-more-link">
								All Services <ArrowRight size={12} />
							</Button>
						</Link>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}

export default ServiceMetrics;
