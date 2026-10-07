import { useCallback, useMemo, useState } from 'react';
import { Compass } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@signozhq/ui/select';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import {
	QuerySearchV2Provider,
	useExpression,
	useInputExpression,
	useQuerySearchInitialExpressionProp,
	useQuerySearchOnChange,
	useQuerySearchOnRun,
	useUserExpression,
} from 'components/QueryBuilderV2';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';
import { validateQuery } from 'utils/queryValidationUtils';

import { getEntityConfig } from '../../Base/entity.registry';
import { logInfraExplorerNavigatedEvent } from '../../Base/events';
import {
	buildRelatedFilterClauses,
	EntityAttributes,
	formatRelatedFilterClause,
	RelatedFilterClause,
	getEntityNameAttributeKey,
	getRelatedCategories,
	resolveRelatedCategory,
} from '../../Base/relations';
import { getDrawerDurationMs } from '../../Base/useDrawerLifecycleStore';
import { buildK8sListNavigationUrl } from '../../Base/utils';
import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
	K8S_CATEGORY_LABELS,
	K8S_CATEGORY_SINGULAR_LABELS,
	METRIC_NAMESPACE_BY_ENTITY,
	VIEW_TYPES,
} from '../../constants';
import EntityDateTimeSelector from '../EntityDateTimeSelector/EntityDateTimeSelector';
import { useEntityDetailsTime } from '../EntityDateTimeSelector/useEntityDetailsTime';
import { logInfraDrawerFilterCustomizedEvent } from '../events';
import { RelatedEntitiesTable } from './RelatedEntitiesTable';
import { ScopeChip } from './ScopeChip';
import { useCarriedOverFilters } from './useCarriedOverFilters';
import { useRelatedEntities } from './useRelatedEntities';

import styles from './EntityOverview.module.scss';

export interface EntityOverviewProps {
	category: InfraMonitoringEntity;
	eventEntity: string;
	/** The drawer entity's own attributes, which scope every related query */
	attributes: EntityAttributes;
	/** The drawer's own record and query prefix, so a row click can leave a
	 * trail that steps back without fetching again */
	entity: unknown;
	entityName: string;
	queryKeyPrefix: string;
}

interface ContentProps extends EntityOverviewProps {
	targetCategory: InfraMonitoringEntity;
	lockedExpression: string;
	lockedClauses: RelatedFilterClause[];
	onCategoryChange: (category: string) => void;
}

function EntityOverviewContent({
	category,
	eventEntity,
	attributes,
	entity,
	entityName,
	queryKeyPrefix,
	targetCategory,
	lockedExpression,
	lockedClauses,
	onCategoryChange,
}: ContentProps): JSX.Element | null {
	const { timeRange } = useEntityDetailsTime();
	const expression = useExpression();
	const userExpression = useUserExpression();
	const inputExpression = useInputExpression();
	const querySearchOnChange = useQuerySearchOnChange();
	const querySearchOnRun = useQuerySearchOnRun();
	const querySearchInitialExpressionProp = useQuerySearchInitialExpressionProp();

	const targetConfig = getEntityConfig(targetCategory);

	useCarriedOverFilters(targetCategory);

	const {
		records,
		total,
		isLoading,
		isFetching,
		isError,
		error,
		endTimeBeforeRetention,
		setPage,
		setLimit,
		refetch,
		cancel,
	} = useRelatedEntities({
		fetchListData: targetConfig?.list.fetchListData,
		queryKey: `${targetCategory}RelatedEntities`,
		expression,
		timeRange,
	});

	// The editor holds only what the user typed; the locked scope is shown beside it
	const queryData = useMemo(
		(): IBuilderQuery =>
			({
				aggregateOperator: 'noop',
				filter: { expression: userExpression },
			}) as IBuilderQuery,
		[userExpression],
	);

	const handleCategoryChange = useCallback(
		(value: string | string[]): void => {
			if (typeof value === 'string') {
				onCategoryChange(value);
			}
		},
		[onCategoryChange],
	);

	const handleRunQuery = useCallback(
		(updatedExpression?: string): void => {
			const newUserExpression = updatedExpression
				? getUserExpressionFromCombined(lockedExpression, updatedExpression)
				: inputExpression;

			const validation = validateQuery(
				combineInitialAndUserExpression(lockedExpression, newUserExpression || ''),
			);

			if (!validation.isValid) {
				return;
			}

			querySearchOnRun(newUserExpression);
			logInfraDrawerFilterCustomizedEvent(
				category,
				VIEW_TYPES.OVERVIEW,
				newUserExpression || '',
				'search',
			);
			refetch();
		},
		[lockedExpression, inputExpression, querySearchOnRun, category, refetch],
	);

	const handleNavigate = useCallback((): void => {
		logInfraExplorerNavigatedEvent({
			entityType: category,
			destination: 'k8s_list',
			source: 'overview_cta',
			tab: VIEW_TYPES.OVERVIEW,
			sourceKey: targetCategory,
			drawerDurationMsAtNavigation: getDrawerDurationMs(),
		});

		openInNewTab(buildK8sListNavigationUrl(targetCategory, expression));
	}, [category, targetCategory, expression]);

	if (!targetConfig) {
		return null;
	}

	const targetLabel = K8S_CATEGORY_LABELS[targetCategory];

	return (
		<div className={styles.container}>
			<div className={styles.controls}>
				<EntityDateTimeSelector
					eventEntity={eventEntity}
					category={category}
					view={VIEW_TYPES.OVERVIEW}
				/>

				<RunQueryBtn
					isLoadingQueries={isFetching}
					onStageRunQuery={(): void => handleRunQuery()}
					handleCancelQuery={cancel}
				/>
			</div>

			<div className={styles.filterRow}>
				<ScopeChip clauses={lockedClauses} expression={lockedExpression} />

				<div className={styles.filterInput}>
					<QuerySearch
						queryData={queryData}
						dataSource={DataSource.METRICS}
						onChange={querySearchOnChange}
						onRun={handleRunQuery}
						signalSource=""
						showFilterSuggestionsWithoutMetric
						placeholder={`Filter these ${targetLabel.toLowerCase()}`}
						metricNamespace={METRIC_NAMESPACE_BY_ENTITY[targetCategory]}
						initialExpression={querySearchInitialExpressionProp}
					/>
				</div>
			</div>

			<RelatedEntitiesTable
				key={targetCategory}
				targetCategory={targetCategory}
				header={
					<div className={styles.resourcePicker}>
						<Typography.Text color="muted" size="small">
							Showing
						</Typography.Text>

						<Select value={targetCategory} onChange={handleCategoryChange}>
							<SelectTrigger
								className={styles.resourceTrigger}
								data-testid="overview-resource-select"
							>
								<SelectValue>{targetLabel}</SelectValue>
							</SelectTrigger>
							{/* The drawer sits at z-index 50 and select content ships without one */}
							<SelectContent className={styles.resourceOptions}>
								{getRelatedCategories(category, attributes).map((relatedCategory) => (
									<SelectItem
										key={relatedCategory}
										value={relatedCategory}
										testId={`overview-resource-option-${relatedCategory}`}
									>
										{K8S_CATEGORY_LABELS[relatedCategory]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<TooltipSimple
							title={`View on ${targetLabel.toLowerCase()} page`}
							side="top"
							arrow
						>
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={handleNavigate}
								data-testid="overview-view-on-list-page"
								prefix={<Compass size={16} />}
							/>
						</TooltipSimple>
					</div>
				}
				listConfig={targetConfig.list}
				records={records}
				total={total}
				isLoading={isLoading}
				isError={isError}
				error={error}
				endTimeBeforeRetention={endTimeBeforeRetention}
				source={{ category, label: entityName, entity, queryKeyPrefix }}
				onPageChange={setPage}
				onLimitChange={setLimit}
			/>
		</div>
	);
}

export default function EntityOverview(
	props: EntityOverviewProps,
): JSX.Element | null {
	const { category, attributes } = props;

	// Tied to the resource it was picked on, so another drawer starts at its
	// own default instead of inheriting the last pick
	const [selection, setSelection] = useState<{
		identity: string;
		category: string;
	} | null>(null);

	const identity = `${category}:${
		attributes[getEntityNameAttributeKey(category)] ?? ''
	}`;

	const targetCategory = resolveRelatedCategory(
		category,
		attributes,
		selection?.identity === identity ? selection.category : null,
	);

	const handleCategoryChange = useCallback(
		(value: string): void => setSelection({ identity, category: value }),
		[identity],
	);

	const lockedClauses = targetCategory
		? buildRelatedFilterClauses(category, targetCategory, attributes)
		: [];
	const lockedExpression = lockedClauses
		.map(formatRelatedFilterClause)
		.join(' AND ');

	if (!targetCategory) {
		return (
			<div className={styles.noRelations}>
				<Typography.Text color="muted">
					{`Nothing related to this ${K8S_CATEGORY_SINGULAR_LABELS[category]} was reported in this time range.`}
				</Typography.Text>
			</div>
		);
	}

	return (
		<QuerySearchV2Provider
			queryParamKey={INFRA_MONITORING_K8S_PARAMS_KEYS.OVERVIEW_EXPRESSION}
			initialExpression={lockedExpression}
		>
			<EntityOverviewContent
				{...props}
				targetCategory={targetCategory}
				lockedExpression={lockedExpression}
				lockedClauses={lockedClauses}
				onCategoryChange={handleCategoryChange}
			/>
		</QuerySearchV2Provider>
	);
}
