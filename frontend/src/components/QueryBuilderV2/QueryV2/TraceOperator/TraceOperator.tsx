/* eslint-disable react/require-default-props */
/* eslint-disable sonarjs/no-duplicate-string */

import './TraceOperator.styles.scss';

import { Button, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import {
	IBuilderQuery,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import QueryAddOns from '../QueryAddOns/QueryAddOns';
import QueryAggregation from '../QueryAggregation/QueryAggregation';
import TraceOperatorEditor from './TraceOperatorEditor';

export default function TraceOperator({
	traceOperator,
	isListViewPanel = false,
}: {
	traceOperator: IBuilderTraceOperator;
	isListViewPanel?: boolean;
}): JSX.Element {
	const { panelType, removeTraceOperator } = useQueryBuilder();
	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: traceOperator,
		entityVersion: '',
		isForTraceOperator: true,
	});

	const handleTraceOperatorChange = useCallback(
		(traceOperatorExpression: string) => {
			handleChangeQueryData('expression', traceOperatorExpression);
		},
		[handleChangeQueryData],
	);

	const handleChangeAggregateEvery = useCallback(
		(value: IBuilderQuery['stepInterval']) => {
			handleChangeQueryData('stepInterval', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeAggregation = useCallback(
		(value: string) => {
			handleChangeQueryData('aggregations', [
				{
					expression: value,
				},
			]);
		},
		[handleChangeQueryData],
	);

	return (
		<div className={cx('qb-trace-operator', !isListViewPanel && 'non-list-view')}>
			<div className="qb-trace-operator-container">
				<div
					className={cx(
						'qb-trace-operator-label-with-input',
						!isListViewPanel && 'qb-trace-operator-arrow',
					)}
				>
					<Typography.Text className="label">Trace Operator</Typography.Text>
					<div className="qb-trace-operator-editor-container">
						<TraceOperatorEditor
							value={traceOperator?.expression || ''}
							traceOperator={traceOperator}
							onChange={handleTraceOperatorChange}
						/>
					</div>
				</div>

				{!isListViewPanel && (
					<div className="qb-trace-operator-aggregation-container">
						<div className={cx(!isListViewPanel && 'qb-trace-operator-arrow')}>
							<QueryAggregation
								dataSource={DataSource.TRACES}
								key={`query-search-${traceOperator.queryName}`}
								panelType={panelType || undefined}
								onAggregationIntervalChange={handleChangeAggregateEvery}
								onChange={handleChangeAggregation}
								queryData={traceOperator}
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
								query={traceOperator}
								version="v3"
								isForTraceOperator
								isListViewPanel={false}
								showReduceTo={false}
								panelType={panelType}
							/>
						</div>
					</div>
				)}
			</div>
			<Tooltip title="Remove Trace Operator" placement="topLeft">
				<Button className="periscope-btn ghost" onClick={removeTraceOperator}>
					<Trash2 size={14} />
				</Button>
			</Tooltip>
		</div>
	);
}
