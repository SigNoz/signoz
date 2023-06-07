import { PlusOutlined } from '@ant-design/icons';
import { Button, Col, Row } from 'antd';
import { MAX_FORMULAS, MAX_QUERIES } from 'constants/queryBuilder';
// ** Hooks
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
// ** Constants
import { memo, useEffect, useMemo } from 'react';

// ** Components
import { Formula, Query } from './components';
// ** Types
import { QueryBuilderProps } from './QueryBuilder.interfaces';
// ** Styles

export const QueryBuilder = memo(function QueryBuilder({
	config,
	panelType,
	onRunQuery,
}: QueryBuilderProps): JSX.Element {
	const {
		currentQuery,
		setupInitialDataSource,
		resetQueryBuilderInfo,
		addNewBuilderQuery,
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
		() => currentQuery.builder.queryData.length >= MAX_QUERIES,
		[currentQuery],
	);

	const isDisabledFormulaButton = useMemo(
		() => currentQuery.builder.queryFormulas.length >= MAX_FORMULAS,
		[currentQuery],
	);

	const isAvailableToDisableQuery = useMemo(
		() =>
			currentQuery.builder.queryData.length > 1 ||
			currentQuery.builder.queryFormulas.length > 0,
		[currentQuery],
	);

	return (
		<Row style={{ width: '100%' }} gutter={[0, 20]} justify="start">
			<Col span={24}>
				<Row gutter={[0, 50]}>
					{currentQuery.builder.queryData.map((query, index) => (
						<Col key={query.queryName} span={24}>
							<Query
								index={index}
								isAvailableToDisable={isAvailableToDisableQuery}
								queryVariant={config?.queryVariant || 'dropdown'}
								query={query}
							/>
						</Col>
					))}
					{currentQuery.builder.queryFormulas.map((formula, index) => (
						<Col key={formula.queryName} span={24}>
							<Formula formula={formula} index={index} />
						</Col>
					))}
				</Row>
			</Col>

			<Row style={{ width: '100%' }} gutter={[20, 0]}>
				<Col>
					<Button
						disabled={isDisabledQueryButton}
						type="primary"
						icon={<PlusOutlined />}
						onClick={addNewBuilderQuery}
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

				{onRunQuery && (
					<Col style={{ marginLeft: 'auto' }}>
						<Button onClick={onRunQuery} type="primary">
							Run Query
						</Button>
					</Col>
				)}
			</Row>
		</Row>
	);
});
