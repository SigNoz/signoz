import { Col, Input, Row } from 'antd';
// ** Components
import { ListItemWrapper, ListMarker } from 'container/QueryBuilder/components';
// ** Hooks
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChangeEvent, useCallback, useMemo } from 'react';
import { IBuilderFormula } from 'types/api/queryBuilder/queryBuilderData';

import { AdditionalFiltersToggler } from '../AdditionalFiltersToggler';
// ** Types
import { FormulaProps } from './Formula.interfaces';

const { TextArea } = Input;

export function Formula({
	index,
	formula,
	filterConfigs,
	query,
}: FormulaProps): JSX.Element {
	const {
		removeQueryBuilderEntityByIndex,
		handleSetFormulaData,
	} = useQueryBuilder();

	const { listOfAdditionalFormulaFilters } = useQueryOperations({
		index,
		query,
		filterConfigs,
	});

	const handleDelete = useCallback(() => {
		removeQueryBuilderEntityByIndex('queryFormulas', index);
	}, [index, removeQueryBuilderEntityByIndex]);

	const handleToggleDisableFormula = useCallback((): void => {
		const newFormula: IBuilderFormula = {
			...formula,
			disabled: !formula.disabled,
		};

		handleSetFormulaData(index, newFormula);
	}, [index, formula, handleSetFormulaData]);

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const { name, value } = e.target;
			const newFormula: IBuilderFormula = {
				...formula,
				[name]: value,
			};

			handleSetFormulaData(index, newFormula);
		},
		[index, formula, handleSetFormulaData],
	);

	const renderAdditionalFilters = useMemo(() => <div>asd</div>, []);

	return (
		<ListItemWrapper onDelete={handleDelete}>
			<Col span={24}>
				<ListMarker
					isDisabled={formula.disabled}
					onDisable={handleToggleDisableFormula}
					labelName={formula.queryName}
					index={index}
				/>
			</Col>
			<Col span={24}>
				<TextArea
					name="expression"
					onChange={handleChange}
					size="middle"
					value={formula.expression}
					rows={2}
				/>
			</Col>
			<Col span={24}>
				<Input
					name="legend"
					onChange={handleChange}
					size="middle"
					value={formula.legend}
					addonBefore="Legend Format"
				/>
			</Col>
			<Col>
				<AdditionalFiltersToggler
					listOfAdditionalFilter={listOfAdditionalFormulaFilters}
				>
					<Row gutter={[0, 11]} justify="space-between">
						{renderAdditionalFilters}
					</Row>
				</AdditionalFiltersToggler>
			</Col>
		</ListItemWrapper>
	);
}
