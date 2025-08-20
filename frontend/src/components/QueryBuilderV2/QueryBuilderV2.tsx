import './QueryBuilderV2.styles.scss';

import { OPERATORS, PANEL_TYPES } from 'constants/queryBuilder';
import { Formula } from 'container/QueryBuilder/components/Formula';
import {
	QueryBuilderProps,
	TraceView,
} from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2Provider } from './QueryBuilderV2Context';
import QueryFooter from './QueryV2/QueryFooter/QueryFooter';
import { QueryV2 } from './QueryV2/QueryV2';
import TraceOperator from './QueryV2/TraceOperator/TraceOperator';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { ChartNoAxesGantt, DraftingCompass } from 'lucide-react';
import { IBuilderTraceOperator } from 'types/api/queryBuilder/queryBuilderData';

export const QueryBuilderV2 = memo(function QueryBuilderV2({
	config,
	panelType: newPanelType,
	filterConfigs = {},
	queryComponents,
	isListViewPanel = false,
	showOnlyWhereClause = false,
	showTraceViewSelector = false,
	version,
	onChangeTraceView,
}: QueryBuilderProps): JSX.Element {
	const {
		currentQuery,
		addNewBuilderQuery,
		addNewFormula,
		handleSetConfig,
		panelType,
		initialDataSource,
	} = useQueryBuilder();

	const containerRef = useRef(null);
	const [selectedTraceView, setSelectedTraceView] = useState<TraceView>(
		TraceView.SPANS,
	);

	const traceViewOptions: { label: string; value: TraceView }[] = useMemo(() => {
		return [
			{
				label: 'Spans',
				value: TraceView.SPANS,
				icon: <ChartNoAxesGantt size={14} />,
			},
			{
				label: 'Traces',
				value: TraceView.TRACES,
				icon: <DraftingCompass size={14} />,
			},
		];
	}, []);

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

	const handleChangeTraceView = useCallback(
		(value: TraceView) => {
			setSelectedTraceView(value);
			if (
				currentDataSource === DataSource.TRACES &&
				typeof onChangeTraceView === 'function'
			) {
				onChangeTraceView(value);
			}
		},
		[onChangeTraceView, currentDataSource],
	);

	const shouldShowTraceOperator = useMemo(() => {
		return (
			currentDataSource === DataSource.TRACES &&
			(!isListViewPanel ? selectedTraceView === TraceView.TRACES : true)
		);
	}, [currentDataSource, isListViewPanel, selectedTraceView]);

	const shouldShowTraceViewSelector = useMemo(() => {
		return currentDataSource === DataSource.TRACES && showTraceViewSelector;
	}, [currentDataSource, showTraceViewSelector]);

	const showFormula = useMemo(() => {
		if (currentDataSource === DataSource.TRACES) {
			return !isListViewPanel && selectedTraceView === TraceView.SPANS;
		}

		return true;
	}, [isListViewPanel, selectedTraceView, currentDataSource]);

	const traceOperator = useMemo((): IBuilderTraceOperator | undefined => {
		if (currentQuery.builder.queryTraceOperator.length > 0) {
			return currentQuery.builder.queryTraceOperator[0] || {};
		}

		return undefined;
	}, [currentQuery.builder.queryTraceOperator]);

	return (
		<QueryBuilderV2Provider>
			<div className="query-builder-v2">
				<div className="qb-content-container">
					{shouldShowTraceViewSelector && (
						<div className="qb-trace-view-selector-container">
							<SignozRadioGroup
								value={selectedTraceView}
								options={traceViewOptions}
								onChange={(e): void => {
									handleChangeTraceView(e.target.value);
								}}
							/>
						</div>
					)}

					{isListViewPanel && currentDataSource !== DataSource.TRACES && (
						<QueryV2
							ref={containerRef}
							key={currentQuery.builder.queryData[0].queryName}
							index={0}
							query={currentQuery.builder.queryData[0]}
							filterConfigs={queryFilterConfigs}
							queryComponents={queryComponents}
							showTraceOperator={shouldShowTraceOperator}
							version={version}
							isAvailableToDisable={false}
							queryVariant={config?.queryVariant || 'dropdown'}
							showOnlyWhereClause={showOnlyWhereClause}
							isListViewPanel={isListViewPanel}
						/>
					)}

					{(!isListViewPanel || currentDataSource === DataSource.TRACES) &&
						currentQuery.builder.queryData.map((query, index) => (
							<QueryV2
								ref={containerRef}
								key={query.queryName}
								index={index}
								query={query}
								filterConfigs={queryFilterConfigs}
								queryComponents={queryComponents}
								version={version}
								isAvailableToDisable={false}
								showTraceOperator={shouldShowTraceOperator}
								queryVariant={config?.queryVariant || 'dropdown'}
								showOnlyWhereClause={showOnlyWhereClause}
								isListViewPanel={isListViewPanel}
								signalSource={config?.signalSource || ''}
							/>
						))}

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

					{((!showOnlyWhereClause && !isListViewPanel) ||
						shouldShowTraceOperator) && (
						<QueryFooter
							showFormula={showFormula}
							addNewBuilderQuery={addNewBuilderQuery}
							addNewFormula={addNewFormula}
						/>
					)}

					{shouldShowTraceOperator && (
						<TraceOperator
							isListViewPanel={isListViewPanel}
							traceOperator={traceOperator}
						/>
					)}
				</div>

				{!showOnlyWhereClause && (!isListViewPanel || shouldShowTraceOperator) && (
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
