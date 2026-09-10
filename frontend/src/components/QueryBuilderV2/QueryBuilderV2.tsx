import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Formula } from 'container/QueryBuilder/components/Formula';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { IBuilderTraceOperator } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderField } from './queryBuilderFields.types';
import {
	mergeQueryBuilderFieldsConfig,
	RAW_QUERY_FIELDS,
	resolveQueryBuilderField,
} from './queryBuilderFields.utils';
import { QueryBuilderV2Provider } from './QueryBuilderV2Context';
import { clearPreviousQuery } from './QueryV2/previousQuery.utils';
import QueryFooter from './QueryV2/QueryFooter/QueryFooter';
import { QueryV2 } from './QueryV2/QueryV2';
import TraceOperator from './QueryV2/TraceOperator/TraceOperator';

import './QueryBuilderV2.styles.scss';

// Raw rows come from logs or spans; metrics only exist aggregated.
const RAW_QUERY_SIGNALS = [
	TelemetrytypesSignalDTO.logs,
	TelemetrytypesSignalDTO.traces,
];

export const QueryBuilderV2 = memo(function QueryBuilderV2({
	config,
	panelType: newPanelType,
	fieldsConfig,
	allowedDataSources,
	isRawQuery = false,
	showOnlyWhereClause = false,
	showTraceOperator = false,
	version,
	onSignalSourceChange,
	signalSourceChangeEnabled = false,
	savePreviousQuery = false,
}: QueryBuilderProps): JSX.Element {
	const {
		currentQuery,
		addNewBuilderQuery,
		addNewFormula,
		handleSetConfig,
		addTraceOperator,
		panelType,
		initialDataSource,
		handleRunQuery,
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

	useEffect(() => {
		// always clear on mount and unmount to avoid stale data
		clearPreviousQuery();
		return (): void => {
			clearPreviousQuery();
		};
	}, []);

	const resolvedConfig = useMemo(
		() =>
			mergeQueryBuilderFieldsConfig(
				isRawQuery ? RAW_QUERY_FIELDS : undefined,
				fieldsConfig,
			),
		[isRawQuery, fieldsConfig],
	);

	const additionalQueries = useMemo(
		() =>
			resolveQueryBuilderField(
				QueryBuilderField.AdditionalQueries,
				resolvedConfig,
			),
		[resolvedConfig],
	);

	const formula = useMemo(
		() => resolveQueryBuilderField(QueryBuilderField.Formula, resolvedConfig),
		[resolvedConfig],
	);

	const isMultiQueryAllowed = useMemo(
		() => !additionalQueries.hidden && (!isRawQuery || showTraceOperator),
		[additionalQueries.hidden, showTraceOperator, isRawQuery],
	);

	const queryDataSources = useMemo(
		() => allowedDataSources ?? (isRawQuery ? RAW_QUERY_SIGNALS : undefined),
		[allowedDataSources, isRawQuery],
	);

	// What the editor renders. A single-query builder edits the first query alone, so
	// the query list beside it must not advertise ones there is no way to reach.
	const renderedQueries = useMemo(
		() =>
			isMultiQueryAllowed
				? currentQuery.builder.queryData
				: currentQuery.builder.queryData.slice(0, 1),
		[isMultiQueryAllowed, currentQuery.builder.queryData],
	);

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

	const showQueryList = useMemo(
		() => (!showOnlyWhereClause && !isRawQuery) || showTraceOperator,
		[isRawQuery, showOnlyWhereClause, showTraceOperator],
	);

	const showFormula = useMemo(() => {
		if (formula.hidden) {
			return false;
		}

		if (currentDataSource === DataSource.TRACES) {
			return !isRawQuery;
		}

		return true;
	}, [formula.hidden, isRawQuery, currentDataSource]);

	const showAddTraceOperator = useMemo(
		() => showTraceOperator && !traceOperator && hasAtLeastOneTraceQuery,
		[showTraceOperator, traceOperator, hasAtLeastOneTraceQuery],
	);

	// Nothing left to add means no footer at all, rather than an empty bar under the
	// last query.
	const shouldShowFooter = useMemo(
		() =>
			(!additionalQueries.hidden || showFormula || showAddTraceOperator) &&
			((!showOnlyWhereClause && !isRawQuery) ||
				(currentDataSource === DataSource.TRACES && showTraceOperator)),
		[
			additionalQueries.hidden,
			showFormula,
			showAddTraceOperator,
			isRawQuery,
			showTraceOperator,
			showOnlyWhereClause,
			currentDataSource,
		],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>): void => {
			const target = e.target as HTMLElement | null;
			const tagName = target?.tagName || '';

			const isInputElement =
				['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) ||
				(target?.getAttribute('contenteditable') || '').toLowerCase() === 'true';

			// Allow input elements in qb to run the query when Cmd/Ctrl + Enter is pressed
			if (isInputElement && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				e.preventDefault();
				e.stopPropagation();
				handleRunQuery();
			}
		},
		[handleRunQuery],
	);

	return (
		<QueryBuilderV2Provider>
			<div className="query-builder-v2">
				<div className="qb-content-container" onKeyDownCapture={handleKeyDown}>
					{!isMultiQueryAllowed ? (
						<QueryV2
							ref={containerRef}
							key={currentQuery.builder.queryData[0].queryName}
							index={0}
							query={currentQuery.builder.queryData[0]}
							fieldsConfig={fieldsConfig}
							allowedDataSources={queryDataSources}
							isMultiQueryAllowed={isMultiQueryAllowed}
							showTraceOperator={showTraceOperator}
							hasTraceOperator={hasTraceOperator}
							version={version}
							isAvailableToDisable={false}
							queryVariant={config?.queryVariant || 'dropdown'}
							showOnlyWhereClause={showOnlyWhereClause}
							isRawQuery={isRawQuery}
							signalSource={currentQuery.builder.queryData[0].source as 'meter' | ''}
							onSignalSourceChange={onSignalSourceChange || ((): void => {})}
							signalSourceChangeEnabled={signalSourceChangeEnabled}
							queriesCount={1}
							savePreviousQuery={savePreviousQuery}
						/>
					) : (
						renderedQueries.map((query, index) => (
							<QueryV2
								ref={containerRef}
								key={query.queryName}
								index={index}
								query={query}
								fieldsConfig={fieldsConfig}
								allowedDataSources={queryDataSources}
								version={version}
								isMultiQueryAllowed={isMultiQueryAllowed}
								isAvailableToDisable={false}
								showTraceOperator={showTraceOperator}
								hasTraceOperator={hasTraceOperator}
								queryVariant={config?.queryVariant || 'dropdown'}
								showOnlyWhereClause={showOnlyWhereClause}
								isRawQuery={isRawQuery}
								signalSource={query.source as 'meter' | ''}
								onSignalSourceChange={onSignalSourceChange || ((): void => {})}
								signalSourceChangeEnabled={signalSourceChangeEnabled}
								queriesCount={currentQuery.builder.queryData.length}
								savePreviousQuery={savePreviousQuery}
							/>
						))
					)}

					{!showOnlyWhereClause &&
						currentQuery.builder.queryFormulas?.length > 0 && (
							<div className="qb-formulas-container">
								{currentQuery.builder.queryFormulas.map((formula, index) => {
									const query =
										currentQuery.builder.queryData[index] ||
										currentQuery.builder.queryData[0];

									return (
										<div key={formula.queryName} className="qb-formula">
											<Formula query={query} formula={formula} index={index} isQBV2 />
										</div>
									);
								})}
							</div>
						)}

					{shouldShowFooter && (
						<QueryFooter
							showAddQuery={!additionalQueries.hidden}
							showAddFormula={showFormula}
							isAddFormulaDisabled={formula.disabled}
							addFormulaDisabledReason={formula.reason}
							addNewBuilderQuery={addNewBuilderQuery}
							isAddQueryDisabled={additionalQueries.disabled}
							addQueryDisabledReason={additionalQueries.reason}
							addNewFormula={addNewFormula}
							addTraceOperator={addTraceOperator}
							showAddTraceOperator={showAddTraceOperator}
						/>
					)}

					{hasTraceOperator && (
						<TraceOperator
							isRawQuery={isRawQuery}
							fieldsConfig={resolvedConfig}
							traceOperator={traceOperator as IBuilderTraceOperator}
						/>
					)}
				</div>

				{showQueryList && (
					<div className="query-names-section">
						{renderedQueries.map((query) => (
							<div key={query.queryName} className="query-name">
								{query.queryName}
							</div>
						))}

						{currentQuery.builder.queryFormulas?.map((formula) => (
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
