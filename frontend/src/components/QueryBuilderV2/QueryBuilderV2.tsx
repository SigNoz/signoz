import './QueryBuilderV2.styles.scss';

import { PANEL_TYPES } from 'constants/queryBuilder';
import { Formula } from 'container/QueryBuilder/components/Formula';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useEffect, useMemo } from 'react';
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
	showFunctions = false,
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

	console.log('isListViewPanel', isListViewPanel, showFunctions);

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

	return (
		<QueryBuilderV2Provider>
			<div className="query-builder-v2">
				<div className="qb-content-container">
					{currentQuery.builder.queryData.map((query, index) => (
						<QueryV2
							key={query.queryName}
							index={index}
							query={query}
							filterConfigs={filterConfigs}
							queryComponents={queryComponents}
							version={version}
							isAvailableToDisable={false}
							queryVariant={config?.queryVariant || 'dropdown'}
							showOnlyWhereClause={showOnlyWhereClause}
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

					{!showOnlyWhereClause && (
						<QueryFooter
							addNewBuilderQuery={addNewBuilderQuery}
							addNewFormula={addNewFormula}
						/>
					)}
				</div>

				{!showOnlyWhereClause && (
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
