import { Select, Typography } from 'antd';
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

	return (
		<div className="anomaly-threshold-container">
			<div className="alert-condition-sentences">
				{/* Sentence 1 */}
				<div className="alert-condition-sentence">
					<Typography.Text data-testid="notification-text" className="sentence-text">
						Send notification when the observed value for
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
						style={{ width: 80 }}
						options={queryNames}
					/>
					<Typography.Text
						data-testid="evaluation-window-text"
						className="sentence-text"
					>
						during the last
					</Typography.Text>
					<Select
						value={thresholdState.evaluationWindow}
						data-testid="evaluation-window-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_EVALUATION_WINDOW',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_TIME_DURATION_OPTIONS}
					/>
				</div>
				{/* Sentence 2 */}
				<div className="alert-condition-sentence">
					<Typography.Text data-testid="threshold-text" className="sentence-text">
						is
					</Typography.Text>
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
						style={{ width: 80 }}
						options={deviationOptions}
					/>
					<Typography.Text data-testid="deviations-text" className="sentence-text">
						deviations
					</Typography.Text>
					<Select
						value={thresholdState.operator}
						data-testid="operator-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_OPERATOR',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_THRESHOLD_OPERATOR_OPTIONS}
					/>
					<Typography.Text
						data-testid="predicted-data-text"
						className="sentence-text"
					>
						the predicted data
					</Typography.Text>
					<Select
						value={thresholdState.matchType}
						data-testid="match-type-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_MATCH_TYPE',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS}
					/>
				</div>
				{/* Sentence 3 */}
				<div className="alert-condition-sentence">
					<Typography.Text data-testid="using-the-text" className="sentence-text">
						using the
					</Typography.Text>
					<Select
						value={thresholdState.algorithm}
						data-testid="algorithm-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_ALGORITHM',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_ALGORITHM_OPTIONS}
					/>
					<Typography.Text
						data-testid="algorithm-with-text"
						className="sentence-text"
					>
						algorithm with
					</Typography.Text>
					<Select
						value={thresholdState.seasonality}
						data-testid="seasonality-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_SEASONALITY',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_SEASONALITY_OPTIONS}
					/>
					<Typography.Text data-testid="seasonality-text" className="sentence-text">
						seasonality
					</Typography.Text>
				</div>
			</div>
		</div>
	);
}

export default AnomalyThreshold;
