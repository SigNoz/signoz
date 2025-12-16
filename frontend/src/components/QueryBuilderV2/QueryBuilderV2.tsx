import './QueryBuilderV2.styles.scss';

import { OPERATORS, PANEL_TYPES } from 'constants/queryBuilder';
import { Formula } from 'container/QueryBuilder/components/Formula';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useEffect, useMemo, useRef } from 'react';
import { IBuilderTraceOperator } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2Provider } from './QueryBuilderV2Context';
import QueryFooter from './QueryV2/QueryFooter/QueryFooter';
import { QueryV2 } from './QueryV2/QueryV2';
import TraceOperator from './QueryV2/TraceOperator/TraceOperator';

export const QueryBuilderV2 = memo(function QueryBuilderV2({
	config,
	panelType: newPanelType,
	filterConfigs = {},
	queryComponents,
	isListViewPanel = false,
	showOnlyWhereClause = false,
	showTraceOperator = false,
	version,
	onSignalSourceChange,
	signalSourceChangeEnabled = false,
}: QueryBuilderProps): JSX.Element {
	const {
		currentQuery,
		addNewBuilderQuery,
		addNewFormula,
		handleSetConfig,
		addTraceOperator,
		panelType,
		initialDataSource,
	} = useQueryBuilder();

	const containerRef = useRef(null);

	const currentDataSource = useMemo(
		() =>
			(config && config.queryVariant === 'static' && config.initialDataSource) ||
			null,
		[config],
	);

	useEffect(() => {
		if (currentDataSource !== initialDataSource || newPanelType !== panelType) {
			if (newPanelType === PANEL_TYPES.BAR) {
				handleSetConfig(PANEL_TYPES.BAR, DataSource.METRICS);
				return;
			}
			handleSetConfig(newPanelType, currentDataSource);
		}
	}, [
		handleSetConfig,
		panelType,
		initialDataSource,
		currentDataSource,
		newPanelType,
	]);

	const isMultiQueryAllowed = useMemo(
		() => !isListViewPanel || showTraceOperator,
		[showTraceOperator, isListViewPanel],
	);

	const listViewLogFilterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		};

		return config;
	}, []);

	const listViewTracesFilterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
			limit: { isHidden: true, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		};

		return config;
	}, []);

	const queryFilterConfigs = useMemo(() => {
		if (isListViewPanel) {
			return currentQuery.builder.queryData[0].dataSource === DataSource.TRACES
				? listViewTracesFilterConfigs
				: listViewLogFilterConfigs;
		}

		return filterConfigs;
	}, [
		isListViewPanel,
		filterConfigs,
		currentQuery.builder.queryData,
		listViewLogFilterConfigs,
		listViewTracesFilterConfigs,
	]);

	const traceOperator = useMemo((): IBuilderTraceOperator | undefined => {
		if (
			currentQuery.builder.queryTraceOperator &&
			currentQuery.builder.queryTraceOperator.length > 0
		) {
			return currentQuery.builder.queryTraceOperator[0];
		}

		return undefined;
	}, [currentQuery.builder.queryTraceOperator]);

	const hasAtLeastOneTraceQuery = useMemo(
		() =>
			currentQuery.builder.queryData.some(
				(query) => query.dataSource === DataSource.TRACES,
			),
		[currentQuery.builder.queryData],
	);

	const hasTraceOperator = useMemo(
		() => showTraceOperator && hasAtLeastOneTraceQuery && Boolean(traceOperator),
		[showTraceOperator, traceOperator, hasAtLeastOneTraceQuery],
	);

	const shouldShowFooter = useMemo(
		() =>
			(!showOnlyWhereClause && !isListViewPanel) ||
			(currentDataSource === DataSource.TRACES && showTraceOperator),
		[isListViewPanel, showTraceOperator, showOnlyWhereClause, currentDataSource],
	);

	const showQueryList = useMemo(
		() => (!showOnlyWhereClause && !isListViewPanel) || showTraceOperator,
		[isListViewPanel, showOnlyWhereClause, showTraceOperator],
	);

	const showFormula = useMemo(() => {
		if (currentDataSource === DataSource.TRACES) {
			return !isListViewPanel;
		}

		return true;
	}, [isListViewPanel, currentDataSource]);

	const showAddTraceOperator = useMemo(
		() => showTraceOperator && !traceOperator && hasAtLeastOneTraceQuery,
		[showTraceOperator, traceOperator, hasAtLeastOneTraceQuery],
	);

	return (
		<QueryBuilderV2Provider>
			<div className="query-builder-v2">
				<div className="qb-content-container">
					{!isMultiQueryAllowed ? (
						<QueryV2
							ref={containerRef}
							key={currentQuery.builder.queryData[0].queryName}
							index={0}
							query={currentQuery.builder.queryData[0]}
							filterConfigs={queryFilterConfigs}
							queryComponents={queryComponents}
							isMultiQueryAllowed={isMultiQueryAllowed}
							showTraceOperator={showTraceOperator}
							hasTraceOperator={hasTraceOperator}
							version={version}
							isAvailableToDisable={false}
							queryVariant={config?.queryVariant || 'dropdown'}
							showOnlyWhereClause={showOnlyWhereClause}
							isListViewPanel={isListViewPanel}
							onSignalSourceChange={onSignalSourceChange || ((): void => {})}
							signalSourceChangeEnabled={signalSourceChangeEnabled}
							queriesCount={1}
						/>
					) : (
						currentQuery.builder.queryData.map((query, index) => (
							<QueryV2
								ref={containerRef}
								key={query.queryName}
								index={index}
								query={query}
								filterConfigs={queryFilterConfigs}
								queryComponents={queryComponents}
								version={version}
								isMultiQueryAllowed={isMultiQueryAllowed}
								isAvailableToDisable={false}
								showTraceOperator={showTraceOperator}
								hasTraceOperator={hasTraceOperator}
								queryVariant={config?.queryVariant || 'dropdown'}
								showOnlyWhereClause={showOnlyWhereClause}
								isListViewPanel={isListViewPanel}
								signalSource={query.source as 'meter' | ''}
								onSignalSourceChange={onSignalSourceChange || ((): void => {})}
								signalSourceChangeEnabled={signalSourceChangeEnabled}
								queriesCount={currentQuery.builder.queryData.length}
							/>
						))
					)}

					{!showOnlyWhereClause && currentQuery.builder.queryFormulas.length > 0 && (
						<div className="qb-formulas-container">
							{currentQuery.builder.queryFormulas.map((formula, index) => {
								const query =
									currentQuery.builder.queryData[index] ||
									currentQuery.builder.queryData[0];

								return (
									<div key={formula.queryName} className="qb-formula">
										<Formula
											filterConfigs={filterConfigs}
											query={query}
											formula={formula}
											index={index}
											isAdditionalFilterEnable={false}
											isQBV2
										/>
									</div>
								);
							})}
						</div>
					)}

					{shouldShowFooter && (
						<QueryFooter
							showAddFormula={showFormula}
							addNewBuilderQuery={addNewBuilderQuery}
							addNewFormula={addNewFormula}
							addTraceOperator={addTraceOperator}
							showAddTraceOperator={showAddTraceOperator}
						/>
					)}

					{hasTraceOperator && (
						<TraceOperator
							isListViewPanel={isListViewPanel}
							traceOperator={traceOperator as IBuilderTraceOperator}
						/>
					)}
				</div>

				{showQueryList && (
					<div className="query-names-section">
						{currentQuery.builder.queryData.map((query) => (
							<div key={query.queryName} className="query-name">
								{query.queryName}
							</div>
						))}

						{currentQuery.builder.queryFormulas.map((formula) => (
							<div key={formula.queryName} className="formula-name">
								{formula.queryName}
							</div>
						))}
					</div>
				)}
			</div>
		</QueryBuilderV2Provider>
	);
});
