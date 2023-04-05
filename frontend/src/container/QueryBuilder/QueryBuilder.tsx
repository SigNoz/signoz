import { PlusOutlined } from '@ant-design/icons';
import { Button, Col, Row } from 'antd';
// ** Hooks
import { useQueryBuilder } from 'hooks/useQueryBuilder';
import { MAX_FORMULAS } from 'lib/newQueryBuilder/createNewFormulaName';
// ** Constants
import { MAX_QUERIES } from 'lib/newQueryBuilder/createNewQueryName';
import React, { memo, useEffect, useMemo } from 'react';

// ** Components
import { Query } from './components';
// ** Types
import { QueryBuilderProps } from './QueryBuilder.interfaces';
// ** Styles
import { StyledCol, StyledDeleteEntity } from './QueryBuilder.styled';

export const QueryBuilder = memo(function QueryBuilder({
	config,
	panelType,
}: QueryBuilderProps): JSX.Element {
	const {
		queryBuilderData,
		setupInitialDataSource,
		addNewQuery,
		removeEntityByIndex,
	} = useQueryBuilder();

	useEffect(() => {
		if (config && config.queryVariant === 'static') {
			setupInitialDataSource(config.initialDataSource);
		}

		return (): void => {
			setupInitialDataSource(null);
		};
	}, [config, setupInitialDataSource]);

	const isDisabledQueryButton = useMemo(
		() => queryBuilderData.queryData.length >= MAX_QUERIES,
		[queryBuilderData],
	);

	const isDisabledFormulaButton = useMemo(
		() => queryBuilderData.queryData.length >= MAX_FORMULAS,
		[queryBuilderData],
	);

	return (
		<Row gutter={[0, 20]} justify="start">
			<Col span={24}>
				<Row gutter={[0, 50]}>
					{queryBuilderData.queryData.map((query, index) => (
						<StyledCol key={query.queryName} span={24}>
							<StyledDeleteEntity
								onClick={(): void => removeEntityByIndex('queryData', index)}
							/>
							<Query
								index={index}
								isAvailableToDisable={queryBuilderData.queryData.length > 1}
								queryVariant={config?.queryVariant || 'dropdown'}
								query={query}
								panelType={panelType}
							/>
						</StyledCol>
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
