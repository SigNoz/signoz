import './ColumnUnitSelector.styles.scss';

import { Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetQueryLabels } from 'hooks/useGetQueryLabels';
import { Dispatch, SetStateAction, useCallback } from 'react';
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

	return (
		<section className="column-unit-selector">
			<Typography.Text className="heading">Column Units</Typography.Text>
			{aggregationQueries.map(({ value, label }) => (
				<YAxisUnitSelector
					defaultValue={columnUnits[value]}
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
