import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { Col, Input, Row, Select } from 'antd';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { LEGEND } from 'constants/global';
// ** Hooks
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import {
	IBuilderFormula,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';
import { getFormatedLegend } from 'utils/getFormatedLegend';
import { popupContainer } from 'utils/selectPopupContainer';

import QBEntityOptions from '../QBEntityOptions/QBEntityOptions';
// ** Types
import { FormulaProps } from './Formula.interfaces';

import './Formula.styles.scss';

export function Formula({
	index,
	formula,
	query,
	isQBV2,
}: FormulaProps): JSX.Element {
	const { removeQueryBuilderEntityByIndex, handleSetFormulaData } =
		useQueryBuilder();

	const { handleChangeFormulaData } = useQueryOperations({
		index,
		query,
		formula,
		entityVersion: '',
	});

	const [isCollapse, setIsCollapsed] = useState(false);

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

	const handleToggleCollapseFormula = (): void => {
		setIsCollapsed(!isCollapse);
	};

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const { name, value } = e.target;
			const newFormula: IBuilderFormula = {
				...formula,
				[name]: name === LEGEND ? getFormatedLegend(value) : value,
			};

			handleSetFormulaData(index, newFormula);
		},
		[index, formula, handleSetFormulaData],
	);

	const handleChangeLimit = useCallback(
		(value: IBuilderFormula['limit']) => {
			handleChangeFormulaData('limit', value);
		},
		[handleChangeFormulaData],
	);

	const handleQBV2OrderByChange = useCallback(
		(value: string) => {
			const [columnName, order] = value.split(' ');
			const newOrderBy: OrderByPayload[] = [{ columnName, order }];
			handleChangeFormulaData('orderBy', newOrderBy);
		},
		[handleChangeFormulaData],
	);

	const qbV2OrderByOptions = useMemo(
		() => [
			{ label: `${formula.queryName} asc`, value: `${formula.queryName} asc` },
			{ label: `${formula.queryName} desc`, value: `${formula.queryName} desc` },
		],
		[formula.queryName],
	);

	const qbV2OrderByValue = useMemo(
		() =>
			formula.orderBy?.length
				? `${formula.orderBy[0].columnName} ${formula.orderBy[0].order}`
				: undefined,
		[formula.orderBy],
	);

	return (
		<Row gutter={[0, 15]}>
			<QBEntityOptions
				isCollapsed={isCollapse}
				showFunctions={false}
				entityType="formula"
				entityData={formula}
				onToggleVisibility={handleToggleDisableFormula}
				onDelete={handleDelete}
				onCollapseEntity={handleToggleCollapseFormula}
				showDeleteButton
			/>

			{!isCollapse && (
				<Row gutter={[0, 15]} className="formula-container">
					<Col span={24}>
						<Input.TextArea
							name="expression"
							className="formula-expression"
							onChange={handleChange}
							size="middle"
							value={formula.expression}
							placeholder="Enter formula"
							rows={2}
						/>
					</Col>
					<Col span={24}>
						<Input
							name="legend"
							className="formula-legend"
							onChange={handleChange}
							size="middle"
							value={formula.legend}
							addonBefore="Legend Format"
						/>
					</Col>
					{isQBV2 && (
						<Col span={24}>
							<div className="formula-qbv2-container">
								<div className="periscope-input-with-label">
									<div className="label">Order By</div>
									<div className="input">
										<Select
											getPopupContainer={popupContainer}
											showSearch
											filterOption={false}
											showArrow={false}
											placeholder="Select order by"
											options={qbV2OrderByOptions}
											onChange={handleQBV2OrderByChange}
											value={qbV2OrderByValue}
											style={{ width: '100%' }}
										/>
									</div>
								</div>
								<InputWithLabel
									label="Limit"
									type="number"
									onChange={(value): void => handleChangeLimit(Number(value))}
									initialValue={formula?.limit ?? undefined}
									placeholder="Enter limit"
								/>
							</div>
						</Col>
					)}
				</Row>
			)}
		</Row>
	);
}
