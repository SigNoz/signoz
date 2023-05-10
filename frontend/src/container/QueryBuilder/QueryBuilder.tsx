import { PlusOutlined } from '@ant-design/icons';
import { Button, Col, Row } from 'antd';
import { MAX_FORMULAS, MAX_QUERIES } from 'constants/queryBuilder';
// ** Hooks
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
// ** Constants
import React, { memo, useEffect, useMemo } from 'react';

// ** Components
import { Formula, Query } from './components';
// ** Types
import { QueryBuilderProps } from './QueryBuilder.interfaces';
// ** Styles

export const QueryBuilder = memo(function QueryBuilder({
	config,
	panelType,
}: QueryBuilderProps): JSX.Element {
	const {
		queryBuilderData,
		setupInitialDataSource,
		resetQueryBuilderInfo,
		addNewQuery,
		addNewFormula,
		handleSetPanelType,
	} = useQueryBuilder();

	useEffect(() => {
		if (config && config.queryVariant === 'static') {
			setupInitialDataSource(config.initialDataSource);
		}
	}, [config, setupInitialDataSource]);

	useEffect(() => {
		handleSetPanelType(panelType);
	}, [handleSetPanelType, panelType]);

	useEffect(
		() => (): void => {
			resetQueryBuilderInfo();
		},
		[resetQueryBuilderInfo],
	);

	const isDisabledQueryButton = useMemo(
		() => queryBuilderData.queryData.length >= MAX_QUERIES,
		[queryBuilderData],
	);

	const isDisabledFormulaButton = useMemo(
		() => queryBuilderData.queryFormulas.length >= MAX_FORMULAS,
		[queryBuilderData],
	);

	const isAvailableToDisableQuery = useMemo(
		() =>
			queryBuilderData.queryData.length > 1 ||
			queryBuilderData.queryFormulas.length > 0,
		[queryBuilderData],
	);

	return (
		<Row gutter={[0, 20]} justify="start">
			<Col span={24}>
				<Row gutter={[0, 50]}>
					{queryBuilderData.queryData.map((query, index) => (
						<Col key={query.queryName} span={24}>
							<Query
								index={index}
								isAvailableToDisable={isAvailableToDisableQuery}
								queryVariant={config?.queryVariant || 'dropdown'}
								query={query}
							/>
						</Col>
					))}
					{queryBuilderData.queryFormulas.map((formula, index) => (
						<Col key={formula.queryName} span={24}>
							<Formula formula={formula} index={index} />
						</Col>
					))}
				</Row>
			</Col>

			<Row gutter={[20, 0]}>
				<Col>
					<Button
						disabled={isDisabledQueryButton}
						type="primary"
						icon={<PlusOutlined />}
						onClick={addNewQuery}
					>
						Query
					</Button>
				</Col>
				<Col>
					<Button
						disabled={isDisabledFormulaButton}
						onClick={addNewFormula}
						type="primary"
						icon={<PlusOutlined />}
					>
						Formula
					</Button>
				</Col>
			</Row>
		</Row>
	);
});
