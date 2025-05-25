import './LogsQB.styles.scss';

import { Button, Dropdown } from 'antd';
import { ENTITY_VERSION_V4 } from 'constants/app';
import QBEntityOptions from 'container/QueryBuilder/components/QBEntityOptions/QBEntityOptions';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Copy, Ellipsis, Plus, Sigma, Trash } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import QueryAddOns from '../QueryAddOns/QueryAddOns';
import QueryAggregation from '../QueryAggregation/QueryAggregation';
import QuerySearch from '../QuerySearch/QuerySearch';
import { Formula } from 'container/QueryBuilder/components/Formula/Formula';

export const LogsQB = memo(function LogsQB({
	query,
	filterConfigs,
}: {
	query: IBuilderQuery;
	filterConfigs: QueryBuilderProps['filterConfigs'];
}): JSX.Element {
	const showFunctions = query?.functions?.length > 0;
	const version = ENTITY_VERSION_V4;

	const {
		currentQuery,
		cloneQuery,
		addNewFormula,
		addNewBuilderQuery,
	} = useQueryBuilder();

	const [isCollapsed, setIsCollapsed] = useState(false);

	console.log('isCollapsed', isCollapsed);

	const isListViewPanel = false;
	const index = 0;

	const {
		isMetricsDataSource,
		handleChangeQueryData,
		handleDeleteQuery,
		handleQueryFunctionsUpdates,
	} = useQueryOperations({
		index,
		query,
		filterConfigs,
		isListViewPanel,
		entityVersion: version,
	});

	const handleToggleDisableQuery = useCallback(() => {
		handleChangeQueryData('disabled', !query.disabled);
	}, [handleChangeQueryData, query]);

	const handleToggleCollapsQuery = (): void => {
		setIsCollapsed(!isCollapsed);
	};

	return (
		<div className="logs-qb">
			<div className="qb-content-container">
				<div className="qb-content-section">
					<div className="qb-header-container">
						<div className="query-actions-container">
							<div className="query-actions-left-container">
								<QBEntityOptions
									isMetricsDataSource={isMetricsDataSource}
									showFunctions={
										(version && version === ENTITY_VERSION_V4) ||
										query.dataSource === DataSource.LOGS ||
										showFunctions ||
										false
									}
									isCollapsed={isCollapsed}
									entityType="query"
									entityData={query}
									onToggleVisibility={handleToggleDisableQuery}
									onDelete={handleDeleteQuery}
									onCloneQuery={cloneQuery}
									onCollapseEntity={handleToggleCollapsQuery}
									query={query}
									onQueryFunctionsUpdates={handleQueryFunctionsUpdates}
									showDeleteButton={currentQuery.builder.queryData.length > 1}
									isListViewPanel={isListViewPanel}
									index={index}
								/>
							</div>

							<Dropdown
								className="query-actions-dropdown"
								menu={{
									items: [
										{
											label: 'Clone',
											key: 'clone-query',
											icon: <Copy size={14} />,
										},
										{
											label: 'Delete',
											key: 'delete-query',
											icon: <Trash size={14} />,
										},
									],
								}}
								placement="bottomRight"
							>
								<Ellipsis size={16} />
							</Dropdown>
						</div>
					</div>

					<div className="qb-elements-container">
						<QuerySearch />
						<QueryAggregation source={DataSource.LOGS} />
						<QueryAddOns query={query} version="v3" isListViewPanel={false} />
					</div>
				</div>

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
									isAdditionalFilterEnable={isMetricsDataSource}
								/>
							</div>
						);
					})}
				</div>

				<div className="qb-footer">
					<div className="qb-footer-container">
						<div className="qb-add-new-query">
							<Button
								className="add-new-query-button periscope-btn secondary"
								type="text"
								icon={<Plus size={16} />}
								onClick={addNewBuilderQuery}
							/>
						</div>

						<div className="qb-add-formula">
							<Button
								className="add-formula-button periscope-btn secondary"
								icon={<Sigma size={16} />}
								onClick={addNewFormula}
							>
								Add Formula
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className="query-names-section" />
		</div>
	);
});
