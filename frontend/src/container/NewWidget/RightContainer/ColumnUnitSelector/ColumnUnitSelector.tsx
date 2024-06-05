import './ColumnUnitSelector.styles.scss';

import { Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Dispatch, SetStateAction } from 'react';
import { ColumnUnit } from 'types/api/dashboard/getAll';

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
		return currentQuery.builder.queryData.map((q) => q.queryName);
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
