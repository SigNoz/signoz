import './ColumnUnitSelector.styles.scss';

import { Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetQueryLabels } from 'hooks/useGetQueryLabels';
import { isEmpty } from 'lodash-es';
import { Dispatch, SetStateAction, useCallback, useEffect } from 'react';
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
	const { columnUnits, setColumnUnits } = props;

	const aggregationQueries = useGetQueryLabels(currentQuery);

	const handleColumnUnitSelect = useCallback(
		(queryName: string, value: string): void => {
			setColumnUnits((prev) => ({
				...prev,
				[queryName]: value,
			}));
		},
		[setColumnUnits],
	);

	const getValues = (value: string): string => {
		const currentValue = columnUnits[value];
		if (currentValue) {
			return currentValue;
		}

		// if base query has value, return it
		const baseQuery = value.split('.')[0];

		if (columnUnits[baseQuery]) {
			return columnUnits[baseQuery];
		}

		// if we have value as base query i.e. value = B, but the columnUnit have let say B.count(): 'h' then we need to return B.count()
		// get the queryName B.count() from the columnUnits keys based on the B that we have (first match - 0th aggregationIndex)
		const newQueryWithExpression = Object.keys(columnUnits).find(
			(key) =>
				key.startsWith(baseQuery) &&
				!isEmpty(aggregationQueries.find((query) => query.value === key)),
		);
		if (newQueryWithExpression) {
			return columnUnits[newQueryWithExpression];
		}

		return '';
	};

	useEffect(() => {
		const newColumnUnits = aggregationQueries.reduce((acc, query) => {
			acc[query.value] = getValues(query.value);
			return acc;
		}, {} as Record<string, string>);
		setColumnUnits(newColumnUnits);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [aggregationQueries]);

	return (
		<section className="column-unit-selector">
			<Typography.Text className="heading">Column Units</Typography.Text>
			{aggregationQueries.map(({ value, label }) => (
				<YAxisUnitSelector
					value={columnUnits[value] || ''}
					onSelect={(unitValue: string): void =>
						handleColumnUnitSelect(value, unitValue)
					}
					fieldLabel={label}
					key={value}
					handleClear={(): void => {
						handleColumnUnitSelect(value, '');
					}}
				/>
			))}
		</section>
	);
}
