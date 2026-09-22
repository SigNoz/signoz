import { useCallback, useMemo } from 'react';
import { Compass } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { SelectSimple } from '@signozhq/ui/select';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import {
	QuerySearchV2Provider,
	useExpression,
	useQuerySearchInitialExpressionProp,
	useQuerySearchOnChange,
	useQuerySearchOnRun,
} from 'components/QueryBuilderV2';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { Link } from 'react-router-dom';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { getEntityConfig } from '../../Base/entity.registry';
import { logInfraExplorerNavigatedEvent } from '../../Base/events';
import { resolveRelatedCategory } from '../../Base/relations';
import { getDrawerDurationMs } from '../../Base/useDrawerLifecycleStore';
import { buildK8sListNavigationUrl } from '../../Base/utils';
import {
	ENTITY_FILTER_PLACEHOLDERS,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
	K8S_CATEGORY_LABELS,
	METRIC_NAMESPACE_BY_ENTITY,
	VIEW_TYPES,
} from '../../constants';
import { useInfraMonitoringOverviewCategory } from '../../hooks';
import EntityDateTimeSelector from '../EntityDateTimeSelector/EntityDateTimeSelector';
import { useEntityDetailsTime } from '../EntityDateTimeSelector/useEntityDetailsTime';
import { logInfraDrawerFilterCustomizedEvent } from '../events';
import { RelatedEntitiesTable } from './RelatedEntitiesTable';
import { buildRelatedEntityOptions } from './utils';

import styles from './EntityOverview.module.scss';

interface EntityOverviewProps {
	category: InfraMonitoringEntity;
	eventEntity: string;
	/** Identity expression of the drawer's entity — locked into every related query */
	lockedExpression: string;
}

function EntityOverviewContent({
	category,
	eventEntity,
}: Omit<EntityOverviewProps, 'lockedExpression'>): JSX.Element | null {
	const { timeRange } = useEntityDetailsTime();
	const [requestedCategory, setRequestedCategory] =
		useInfraMonitoringOverviewCategory();

	const expression = useExpression();
	const querySearchOnChange = useQuerySearchOnChange();
	const querySearchOnRun = useQuerySearchOnRun();
	const querySearchInitialExpressionProp = useQuerySearchInitialExpressionProp();

	const targetCategory = resolveRelatedCategory(category, requestedCategory);
	const targetConfig = targetCategory ? getEntityConfig(targetCategory) : null;

	const options = useMemo(() => buildRelatedEntityOptions(category), [category]);

	const queryData = useMemo(
		(): IBuilderQuery =>
			({ aggregateOperator: 'noop', filter: { expression } }) as IBuilderQuery,
		[expression],
	);

	const handleCategoryChange = useCallback(
		(value: string | string[]): void => {
			if (typeof value !== 'string') {
				return;
			}
			void setRequestedCategory(value);
			// Filters written against the previous resource won't resolve on the new one
			querySearchOnRun('');
		},
		[setRequestedCategory, querySearchOnRun],
	);

	const handleRunQuery = useCallback((): void => {
		logInfraDrawerFilterCustomizedEvent(
			category,
			VIEW_TYPES.OVERVIEW,
			expression,
			'search',
		);
	}, [category, expression]);

	const handleNavigate = useCallback((): void => {
		logInfraExplorerNavigatedEvent({
			entityType: category,
			destination: 'k8s_list',
			source: 'overview_cta',
			tab: VIEW_TYPES.OVERVIEW,
			sourceKey: targetCategory,
			drawerDurationMsAtNavigation: getDrawerDurationMs(),
		});
	}, [category, targetCategory]);

	if (!targetCategory || !targetConfig) {
		return null;
	}

	const targetLabel = K8S_CATEGORY_LABELS[targetCategory];

	return (
		<div className={styles.container}>
			<div className={styles.filterContainer}>
				<div className={styles.filterControls}>
					<SelectSimple
						className={styles.resourceSelect}
						items={options}
						value={targetCategory}
						onChange={handleCategoryChange}
						testId="overview-resource-select"
					/>

					<div className={styles.filterControlsRight}>
						<EntityDateTimeSelector
							eventEntity={eventEntity}
							category={category}
							view={VIEW_TYPES.OVERVIEW}
						/>

						<TooltipSimple
							title={`View on ${targetLabel.toLowerCase()} page`}
							side="left"
							arrow
						>
							<Link
								to={buildK8sListNavigationUrl(targetCategory, expression)}
								onClick={handleNavigate}
								data-testid="overview-view-on-list-page"
							>
								<Button
									variant="ghost"
									size="icon"
									color="secondary"
									prefix={<Compass size={16} />}
								/>
							</Link>
						</TooltipSimple>
					</div>
				</div>

				<QuerySearch
					queryData={queryData}
					dataSource={DataSource.METRICS}
					onChange={querySearchOnChange}
					onRun={handleRunQuery}
					signalSource=""
					showFilterSuggestionsWithoutMetric
					placeholder={ENTITY_FILTER_PLACEHOLDERS[targetCategory]}
					metricNamespace={METRIC_NAMESPACE_BY_ENTITY[targetCategory]}
					initialExpression={querySearchInitialExpressionProp}
				/>
			</div>

			<RelatedEntitiesTable
				key={targetCategory}
				targetCategory={targetCategory}
				listConfig={targetConfig.list}
				expression={expression}
				timeRange={timeRange}
			/>
		</div>
	);
}

export default function EntityOverview({
	lockedExpression,
	...rest
}: EntityOverviewProps): JSX.Element {
	return (
		<QuerySearchV2Provider
			queryParamKey={INFRA_MONITORING_K8S_PARAMS_KEYS.OVERVIEW_EXPRESSION}
			initialExpression={lockedExpression}
		>
			<EntityOverviewContent {...rest} />
		</QuerySearchV2Provider>
	);
}
