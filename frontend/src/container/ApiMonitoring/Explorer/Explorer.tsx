import './Explorer.styles.scss';

import { FilterOutlined } from '@ant-design/icons';
import * as Sentry from '@sentry/react';
import { Switch, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useEffect, useMemo, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { ApiMonitoringQuickFiltersConfig } from '../utils';
import DomainList from './Domains/DomainList';

function Explorer(): JSX.Element {
	const [showIP, setShowIP] = useState<boolean>(true);

	const { currentQuery } = useQueryBuilder();

	useEffect(() => {
		logEvent('API Monitoring: Landing page visited', {});
	}, []);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
					},
				],
			},
		}),
		[currentQuery],
	);
	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={cx('api-monitoring-page', 'filter-visible')}>
				<section className="api-quick-filter-left-section">
					<div className="api-quick-filters-header">
						<FilterOutlined />
						<Typography.Text>Filters</Typography.Text>
					</div>

					<div className="api-quick-filters-header">
						<Typography.Text>Show IP addresses</Typography.Text>
						<Switch
							size="small"
							style={{ marginLeft: 'auto' }}
							checked={showIP}
							onClick={(): void => {
								setShowIP((showIP): boolean => {
									logEvent('API Monitoring: Show IP addresses clicked', {
										showIP: !showIP,
									});
									return !showIP;
								});
							}}
						/>
					</div>

					<QuickFilters
						source={QuickFiltersSource.API_MONITORING}
						config={ApiMonitoringQuickFiltersConfig}
						handleFilterVisibilityChange={(): void => {}}
						onFilterChange={(query: Query): void =>
							handleChangeQueryData('filters', query.builder.queryData[0].filters)
						}
					/>
				</section>
				<DomainList
					query={query}
					showIP={showIP}
					handleChangeQueryData={handleChangeQueryData}
				/>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
