import './QueryBuilderV2.styles.scss';

import { OPERATORS, PANEL_TYPES } from 'constants/queryBuilder';
import { Formula } from 'container/QueryBuilder/components/Formula';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useEffect, useMemo, useRef } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2Provider } from './QueryBuilderV2Context';
import QueryFooter from './QueryV2/QueryFooter/QueryFooter';
import { QueryV2 } from './QueryV2/QueryV2';

export const QueryBuilderV2 = memo(function QueryBuilderV2({
	config,
	panelType: newPanelType,
	filterConfigs = {},
	queryComponents,
	isListViewPanel = false,
	showOnlyWhereClause = false,
	version,
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

	return (
		<QueryBuilderV2Provider>
			<div className="query-builder-v2">
				<div className="qb-content-container">
					{currentQuery.builder.queryData.map((query, index) => (
						<QueryV2
							ref={containerRef}
							key={query.queryName}
							index={index}
							query={query}
							filterConfigs={queryFilterConfigs}
							queryComponents={queryComponents}
							version={version}
							isAvailableToDisable={false}
							queryVariant={config?.queryVariant || 'dropdown'}
							showOnlyWhereClause={showOnlyWhereClause}
							isListViewPanel={isListViewPanel}
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
										/>
									</div>
								);
							})}
						</div>
					)}

					{!showOnlyWhereClause && !isListViewPanel && (
						<QueryFooter
							addNewBuilderQuery={addNewBuilderQuery}
							addNewFormula={addNewFormula}
						/>
					)}
				</div>

				{!showOnlyWhereClause && !isListViewPanel && (
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
