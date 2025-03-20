import { Typography } from 'antd';
import Skeleton from 'antd/lib/skeleton';
import { getFormattedDependentServicesData } from 'container/ApiMonitoring/utils';
import { UnfoldVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

import ErrorState from './ErrorState';

interface DependentServicesProps {
	dependentServicesQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}

// need to add a loading state

// discuss slice vs index based rendering
function DependentServices({
	dependentServicesQuery,
}: DependentServicesProps): JSX.Element {
	const {
		data,
		refetch,
		isError,
		isLoading,
		isRefetching,
	} = dependentServicesQuery;

	const [currentRenderCount, setCurrentRenderCount] = useState(0);

	const dependentServicesData = useMemo(() => {
		const formattedDependentServicesData = getFormattedDependentServicesData(
			data?.payload?.data?.result[0].table.rows,
		);
		setCurrentRenderCount(Math.min(formattedDependentServicesData.length, 5));
		return formattedDependentServicesData;
	}, [data]);

	const renderItems = useMemo(
		() => dependentServicesData.slice(0, currentRenderCount),
		[currentRenderCount, dependentServicesData],
	);

	if (isLoading || isRefetching) {
		return <Skeleton />;
	}

	if (isError) {
		return <ErrorState refetch={refetch} />;
	}

	return (
		<div className="top-services-content">
			<div className="top-services-title">
				<span className="title-wrapper">Dependent Services</span>
			</div>
			<div className="dependent-services-container">
				{renderItems.length === 0 ? (
					<div className="no-dependent-services-message-container">
						<div className="no-dependent-services-message-content">
							<img
								src="/Icons/emptyState.svg"
								alt="thinking-emoji"
								className="empty-state-svg"
							/>

							<Typography.Text className="no-dependent-services-message">
								This query had no results. Edit your query and try again!
							</Typography.Text>
						</div>
					</div>
				) : (
					renderItems.map((item) => (
						<div className="top-services-item" key={item.key}>
							<div className="top-services-item-progress">
								<div className="top-services-item-key">{item.serviceName}</div>
								<div className="top-services-item-count">{item.count}</div>
								<div
									className="top-services-item-progress-bar"
									style={{ width: `${item.percentage}%` }}
								/>
							</div>
							<div className="top-services-item-percentage">
								{item.percentage.toFixed(2)}%
							</div>
						</div>
					))
				)}

				{currentRenderCount < dependentServicesData.length && (
					<div
						className="top-services-load-more"
						onClick={(): void => setCurrentRenderCount(dependentServicesData.length)}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
								setCurrentRenderCount(dependentServicesData.length);
							}
						}}
						role="button"
						tabIndex={0}
					>
						<UnfoldVertical size={14} />
						Show more...
					</div>
				)}
			</div>
		</div>
	);
}

export default DependentServices;
