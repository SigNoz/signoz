import './ColumnUnitSelector.styles.scss';

import { Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Dispatch, SetStateAction } from 'react';
import { ColumnUnit } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

import YAxisUnitSelector from '../YAxisUnitSelector';

interface ColumnUnitSelectorProps {
	columnUnits: ColumnUnit;
	setColumnUnits: Dispatch<SetStateAction<ColumnUnit>>;
}

export function ColumnUnitSelector(
	props: ColumnUnitSelectorProps,
): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	function getAggregateColumnsNamesAndLabels(): string[] {
		if (currentQuery.queryType === EQueryType.QUERY_BUILDER) {
			const queries = currentQuery.builder.queryData.map((q) => q.queryName);
			const formulas = currentQuery.builder.queryFormulas.map((q) => q.queryName);
			return [...queries, ...formulas];
		}
		if (currentQuery.queryType === EQueryType.CLICKHOUSE) {
			return currentQuery.clickhouse_sql.map((q) => q.name);
		}
		return currentQuery.promql.map((q) => q.name);
	}

	const { columnUnits, setColumnUnits } = props;
	const aggregationQueries = getAggregateColumnsNamesAndLabels();

	function handleColumnUnitSelect(queryName: string, value: string): void {
		setColumnUnits((prev) => ({
			...prev,
			[queryName]: value,
		}));
	}
	return (
		<section className="column-unit-selector">
			<Typography.Text className="heading">Column Units</Typography.Text>
			{aggregationQueries.map((query) => (
				<YAxisUnitSelector
					defaultValue={columnUnits[query]}
					onSelect={(value: string): void => handleColumnUnitSelect(query, value)}
					fieldLabel={query}
					key={query}
					handleClear={(): void => {
						handleColumnUnitSelect(query, '');
					}}
				/>
			))}
		</section>
	);
}
