import { Select, Typography } from 'antd';
import classNames from 'classnames';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';

import { useCreateAlertState } from '../context';
import {
	ANOMALY_ALGORITHM_OPTIONS,
	ANOMALY_SEASONALITY_OPTIONS,
	ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS,
	ANOMALY_THRESHOLD_OPERATOR_OPTIONS,
	ANOMALY_TIME_DURATION_OPTIONS,
} from '../context/constants';
import { showCondensedLayout } from '../utils';
import { getQueryNames } from './utils';

function AnomalyThreshold(): JSX.Element {
	const { thresholdState, setThresholdState } = useCreateAlertState();

	const { currentQuery } = useQueryBuilder();

	const queryNames = getQueryNames(currentQuery);

	const deviationOptions = useMemo(() => {
		const options = [];
		for (let i = 1; i <= 7; i++) {
			options.push({ label: i.toString(), value: i });
		}
		return options;
	}, []);

	const updateThreshold = (id: string, field: string, value: string): void => {
		setThresholdState({
			type: 'SET_THRESHOLDS',
			payload: thresholdState.thresholds.map((t) =>
				t.id === id ? { ...t, [field]: value } : t,
			),
		});
	};

	const showCondensedLayoutFlag = showCondensedLayout();

	return (
		<div
			className={classNames('anomaly-threshold-container', {
				'condensed-anomaly-threshold-container': showCondensedLayoutFlag,
			})}
		>
			{/* Main condition sentence - combined into one row */}
			<div className="alert-condition-sentence-compact">
				<Typography.Text className="sentence-text">
					Send a notification when
				</Typography.Text>
				<Select
					value={thresholdState.selectedQuery}
					data-testid="query-select"
					onChange={(value): void => {
						setThresholdState({
							type: 'SET_SELECTED_QUERY',
							payload: value,
						});
					}}
					className="query-select-compact"
					options={queryNames}
				/>
				<Typography.Text className="sentence-text">is</Typography.Text>
				<Select
					value={thresholdState.thresholds[0].thresholdValue}
					data-testid="threshold-value-select"
					onChange={(value): void => {
						updateThreshold(
							thresholdState.thresholds[0].id,
							'thresholdValue',
							value.toString(),
						);
					}}
					className="operator-select-compact"
					options={deviationOptions}
				/>
				<Typography.Text className="sentence-text">standard deviations</Typography.Text>
				<Select
					value={thresholdState.operator}
					data-testid="operator-select"
					onChange={(value): void => {
						setThresholdState({
							type: 'SET_OPERATOR',
							payload: value,
						});
					}}
					className="operator-select-compact"
					options={ANOMALY_THRESHOLD_OPERATOR_OPTIONS}
				/>
				<Typography.Text className="sentence-text">the predicted values</Typography.Text>
				<Select
					value={thresholdState.matchType}
					data-testid="match-type-select"
					onChange={(value): void => {
						setThresholdState({
							type: 'SET_MATCH_TYPE',
							payload: value,
						});
					}}
					className="match-type-select-compact"
					options={ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS}
				/>
				<Typography.Text className="sentence-text">during the</Typography.Text>
				<Select
					value={thresholdState.evaluationWindow}
					data-testid="evaluation-window-select"
					onChange={(value): void => {
						setThresholdState({
							type: 'SET_EVALUATION_WINDOW',
							payload: value,
						});
					}}
					className="operator-select-compact"
					options={ANOMALY_TIME_DURATION_OPTIONS}
				/>
				<Typography.Text className="sentence-text">evaluation window using</Typography.Text>
				<Select
					value={thresholdState.algorithm}
					data-testid="algorithm-select"
					onChange={(value): void => {
						setThresholdState({
							type: 'SET_ALGORITHM',
							payload: value,
						});
					}}
					className="operator-select-compact"
					options={ANOMALY_ALGORITHM_OPTIONS}
				/>
				<Typography.Text className="sentence-text">algorithm with</Typography.Text>
				<Select
					value={thresholdState.seasonality}
					data-testid="seasonality-select"
					onChange={(value): void => {
						setThresholdState({
							type: 'SET_SEASONALITY',
							payload: value,
						});
					}}
					className="operator-select-compact"
					options={ANOMALY_SEASONALITY_OPTIONS}
				/>
				<Typography.Text className="sentence-text">seasonality</Typography.Text>
			</div>
		</div>
	);
}

export default AnomalyThreshold;
