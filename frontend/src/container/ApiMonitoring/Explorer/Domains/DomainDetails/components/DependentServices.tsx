import '../DomainDetails.styles.scss';

import { Table, TablePaginationConfig, Typography } from 'antd';
import Skeleton from 'antd/lib/skeleton';
import { QueryParams } from 'constants/query';
import {
	dependentServicesColumns,
	DependentServicesData,
	getFormattedDependentServicesData,
} from 'container/ApiMonitoring/utils';
import { UnfoldVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

import ErrorState from './ErrorState';

interface DependentServicesProps {
	dependentServicesQuery: UseQueryResult<SuccessResponse<any>, unknown>;
	timeRange: {
		startTime: number;
		endTime: number;
	};
}

function DependentServices({
	dependentServicesQuery,
	timeRange,
}: DependentServicesProps): JSX.Element {
	const {
		data,
		refetch,
		isError,
		isLoading,
		isRefetching,
	} = dependentServicesQuery;

	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	const handleShowMoreClick = (): void => {
		setIsExpanded((prev) => !prev);
	};

	const dependentServicesData = useMemo(
		(): DependentServicesData[] =>
			getFormattedDependentServicesData(data?.payload?.data?.result[0].table.rows),
		[data],
	);

	const paginationConfig = useMemo(
		(): TablePaginationConfig => ({
			pageSize: isExpanded ? dependentServicesData.length : 5,
			hideOnSinglePage: true,
			position: ['none', 'none'],
		}),
		[isExpanded, dependentServicesData.length],
	);

	if (isLoading || isRefetching) {
		return <Skeleton />;
	}

	if (isError) {
		return <ErrorState refetch={refetch} />;
	}

	return (
		<div className="top-services-content">
			<div className="dependent-services-container">
				<Table
					loading={isLoading || isRefetching}
					dataSource={dependentServicesData || []}
					columns={dependentServicesColumns}
					rowClassName="table-row-dark"
					pagination={paginationConfig}
					locale={{
						emptyText:
							isLoading || isRefetching ? null : (
								<div className="no-status-code-data-message-container">
									<div className="no-status-code-data-message-content">
										<img
											src="/Icons/emptyState.svg"
											alt="thinking-emoji"
											className="empty-state-svg"
										/>

										<Typography.Text className="no-status-code-data-message">
											This query had no results. Edit your query and try again!
										</Typography.Text>
									</div>
								</div>
							),
					}}
					onRow={(record): { onClick: () => void; className: string } => ({
						onClick: (): void => {
							const url = new URL(
								`/services/${
									record.serviceData.serviceName &&
									record.serviceData.serviceName !== '-'
										? record.serviceData.serviceName
										: ''
								}`,
								window.location.origin,
							);
							const urlQuery = new URLSearchParams();
							urlQuery.set(QueryParams.startTime, timeRange.startTime.toString());
							urlQuery.set(QueryParams.endTime, timeRange.endTime.toString());
							url.search = urlQuery.toString();
							window.open(url.toString(), '_blank');
						},
						className: 'clickable-row',
					})}
				/>

				{dependentServicesData.length > 5 && (
					<div
						className="top-services-load-more"
						onClick={handleShowMoreClick}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
								handleShowMoreClick();
							}
						}}
						role="button"
						tabIndex={0}
					>
						<UnfoldVertical size={14} />
						{isExpanded ? 'Show less...' : 'Show more...'}
					</div>
				)}
			</div>
		</div>
	);
}

export default DependentServices;
