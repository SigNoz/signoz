/* eslint-disable react/require-default-props */
/* eslint-disable sonarjs/no-duplicate-string */

import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import cx from 'classnames';
import './TraceOperator.styles.scss';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback } from 'react';
import {
	IBuilderQuery,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import QueryAddOns from '../QueryAddOns/QueryAddOns';
import QueryAggregation from '../QueryAggregation/QueryAggregation';
import { useTraceOperatorOperations } from 'hooks/queryBuilder/userTraceOperatorOperations';
import { Button, Tooltip } from 'antd';
import { Trash2 } from 'lucide-react';

export default function TraceOperator({
	traceOperator,
	isListViewPanel = false,
}: {
	traceOperator: IBuilderTraceOperator | undefined;
	isListViewPanel?: boolean;
}): JSX.Element {
	const { panelType, currentQuery, removeTraceOperator } = useQueryBuilder();
	const { handleChangeTraceOperatorData } = useTraceOperatorOperations({
		index: 0,
		query: traceOperator,
	});

	const handleTraceOperatorChange = useCallback(
		(traceOperatorExpression: string) => {
			handleChangeTraceOperatorData('expression', traceOperatorExpression);
		},
		[handleChangeTraceOperatorData],
	);

	const handleChangeAggregateEvery = useCallback(
		(value: IBuilderQuery['stepInterval']) => {
			handleChangeTraceOperatorData('stepInterval', value);
		},
		[handleChangeTraceOperatorData],
	);

	const handleChangeAggregation = useCallback(
		(value: string) => {
			handleChangeTraceOperatorData('aggregations', [
				{
					expression: value,
				},
			]);
		},
		[handleChangeTraceOperatorData],
	);

	const handleChangeSpanSource = useCallback(
		(value: string) => {
			handleChangeTraceOperatorData('returnSpansFrom', value);
		},
		[handleChangeTraceOperatorData],
	);

	return (
		<div className={cx('qb-trace-operator', !isListViewPanel && 'non-list-view')}>
			<div className="qb-trace-operator-container">
				<InputWithLabel
					className={cx(
						'qb-trace-operator-input',
						!isListViewPanel && 'qb-trace-operator-arrow',
					)}
					initialValue={traceOperator?.expression || ''}
					label="TRACES MATCHING"
					placeholder="Add condition..."
					type="text"
					onChange={handleTraceOperatorChange}
				/>
				{!isListViewPanel && (
					<div className="qb-trace-operator-aggregation-container">
						<div className={cx(!isListViewPanel && 'qb-trace-operator-arrow')}>
							<QueryAggregation
								dataSource={currentQuery.builder.queryData[0].dataSource}
								key={`query-search-${currentQuery.builder.queryData[0].queryName}-${currentQuery.builder.queryData[0].dataSource}`}
								panelType={panelType || undefined}
								onAggregationIntervalChange={handleChangeAggregateEvery}
								onChange={handleChangeAggregation}
								queryData={currentQuery.builder.queryData[0]} //TODO: replace this with the traceoperator
							/>
						</div>
						<div
							className={cx(
								'qb-trace-operator-add-ons-container',
								!isListViewPanel && 'qb-trace-operator-arrow',
							)}
						>
							<QueryAddOns
								index={0}
								query={currentQuery.builder.queryData[0]} //TODO: replace this with the traceoperator
								version="v3"
								isListViewPanel={false}
								showReduceTo={false}
								panelType={panelType}
							>
								<InputWithLabel
									className="qb-trace-operator-add-ons-input"
									initialValue={traceOperator?.expression || ''}
									label="Using spans from"
									placeholder="Add condition..."
									type="text"
									onChange={handleChangeSpanSource}
								/>
							</QueryAddOns>
						</div>
					</div>
				)}
			</div>
			{true && (
				<Tooltip title="Remove Trace Operator" placement="topLeft">
					<Button className="periscope-btn ghost" onClick={removeTraceOperator}>
						<Trash2 size={14} />
					</Button>
				</Tooltip>
			)}
		</div>
	);
}
