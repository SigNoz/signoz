import { Col, Input, Row } from 'antd';
// ** Components
import {
	FilterLabel,
	ListItemWrapper,
	ListMarker,
} from 'container/QueryBuilder/components';
import HavingFilter from 'container/QueryBuilder/filters/Formula/Having/HavingFilter';
import LimitFilter from 'container/QueryBuilder/filters/Formula/Limit/Limit';
import OrderByFilter from 'container/QueryBuilder/filters/Formula/OrderBy/OrderByFilter';
// ** Hooks
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChangeEvent, useCallback, useMemo } from 'react';
import { IBuilderFormula } from 'types/api/queryBuilder/queryBuilderData';

import { AdditionalFiltersToggler } from '../AdditionalFiltersToggler';
// ** Types
import { FormulaProps } from './Formula.interfaces';

export function Formula({
	index,
	formula,
	filterConfigs,
	query,
	isAdditionalFilterEnable,
}: FormulaProps): JSX.Element {
	const {
		removeQueryBuilderEntityByIndex,
		handleSetFormulaData,
	} = useQueryBuilder();

	const {
		listOfAdditionalFormulaFilters,
		handleChangeFormulaData,
	} = useQueryOperations({
		index,
		query,
		filterConfigs,
		formula,
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

	const handleChangeLimit = useCallback(
		(value: IBuilderFormula['limit']) => {
			handleChangeFormulaData('limit', value);
		},
		[handleChangeFormulaData],
	);

	const handleChangeHavingFilter = useCallback(
		(value: IBuilderFormula['having']) => {
			handleChangeFormulaData('having', value);
		},
		[handleChangeFormulaData],
	);

	const handleChangeOrderByFilter = useCallback(
		(value: IBuilderFormula['orderBy']) => {
			handleChangeFormulaData('orderBy', value);
		},
		[handleChangeFormulaData],
	);

	const renderAdditionalFilters = useMemo(
		() => (
			<>
				<Col span={11}>
					<Row gutter={[11, 5]}>
						<Col flex="5.93rem">
							<FilterLabel label="Limit" />
						</Col>
						<Col flex="1 1 12.5rem">
							<LimitFilter formula={formula} onChange={handleChangeLimit} />
						</Col>
					</Row>
				</Col>
				<Col span={11}>
					<Row gutter={[11, 5]}>
						<Col flex="5.93rem">
							<FilterLabel label="HAVING" />
						</Col>
						<Col flex="1 1 12.5rem">
							<HavingFilter formula={formula} onChange={handleChangeHavingFilter} />
						</Col>
					</Row>
				</Col>
				<Col span={11}>
					<Row gutter={[11, 5]}>
						<Col flex="5.93rem">
							<FilterLabel label="Order by" />
						</Col>
						<Col flex="1 1 12.5rem">
							<OrderByFilter
								query={query}
								formula={formula}
								onChange={handleChangeOrderByFilter}
							/>
						</Col>
					</Row>
				</Col>
			</>
		),
		[
			formula,
			handleChangeHavingFilter,
			handleChangeLimit,
			handleChangeOrderByFilter,
			query,
		],
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
				<Input.TextArea
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
			{isAdditionalFilterEnable && (
				<Col span={24}>
					<AdditionalFiltersToggler
						listOfAdditionalFilter={listOfAdditionalFormulaFilters}
					>
						<Row gutter={[0, 11]} justify="space-between">
							{renderAdditionalFilters}
						</Row>
					</AdditionalFiltersToggler>
				</Col>
			)}
		</ListItemWrapper>
	);
}
