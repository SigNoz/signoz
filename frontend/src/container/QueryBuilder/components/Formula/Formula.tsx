import { Col, Input } from 'antd';
// ** Components
import { ListItemWrapper, ListMarker } from 'container/QueryBuilder/components';
// ** Hooks
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import React, { ChangeEvent, useCallback } from 'react';
import { IBuilderFormula } from 'types/api/queryBuilder/queryBuilderData';

// ** Types
import { FormulaProps } from './Formula.interfaces';

const { TextArea } = Input;

export function Formula({ index, formula }: FormulaProps): JSX.Element {
	const { removeEntityByIndex, handleSetFormulaData } = useQueryBuilder();

	const handleDelete = useCallback(() => {
		removeEntityByIndex('queryFormulas', index);
	}, [index, removeEntityByIndex]);

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
		</ListItemWrapper>
	);
}
