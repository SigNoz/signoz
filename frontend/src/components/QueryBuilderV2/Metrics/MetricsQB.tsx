import './MetricsQB.styles.scss';

import { ENTITY_VERSION_V4 } from 'constants/app';
import { Formula } from 'container/QueryBuilder/components/Formula/Formula';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2Props } from '../QueryBuilderV2';
import QueryFooter from '../QueryV2/QueryFooter/QueryFooter';
import { QueryV2 } from '../QueryV2/QueryV2';

function MetricsQB({ filterConfigs }: QueryBuilderV2Props): JSX.Element {
	const version = ENTITY_VERSION_V4;

	const { currentQuery, addNewFormula, addNewBuilderQuery } = useQueryBuilder();

	const { isMetricsDataSource } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		filterConfigs,
		isListViewPanel: false,
		entityVersion: version,
	});

	console.log('isMetricsDataSource', isMetricsDataSource);

	return (
		<div className="metrics-qb">
			<div className="qb-content-container">
				{currentQuery.builder.queryData.map((query, index) => (
					<QueryV2
						key={query.queryName}
						index={index}
						query={query}
						filterConfigs={filterConfigs}
						version={version}
						isAvailableToDisable={false}
						queryVariant="static"
						source={DataSource.METRICS}
					/>
				))}

				{currentQuery.builder.queryFormulas.length > 0 && (
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
										isAdditionalFilterEnable={false} // TODO: Need to enable this
									/>
								</div>
							);
						})}
					</div>
				)}

				<QueryFooter
					addNewBuilderQuery={addNewBuilderQuery}
					addNewFormula={addNewFormula}
				/>
			</div>

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
		</div>
	);
}

export default MetricsQB;
