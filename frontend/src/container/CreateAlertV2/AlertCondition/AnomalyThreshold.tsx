import { Select, Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';

import { useCreateAlertState } from '../context';
import {
	ANAMOLY_TIME_DURATION_OPTIONS,
	ANOMALY_ALGORITHM_OPTIONS,
	ANOMALY_SEASONALITY_OPTIONS,
	ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS,
	ANOMALY_THRESHOLD_OPERATOR_OPTIONS,
} from '../context/constants';

function AnomalyThreshold(): JSX.Element {
	const { thresholdState, setThresholdState } = useCreateAlertState();

	const { currentQuery } = useQueryBuilder();

	const queryNames = useMemo(() => {
		const queries = currentQuery.builder.queryData.map((query) => ({
			label: query.queryName,
			value: query.queryName,
		}));
		const formulas = currentQuery.builder.queryFormulas.map((formula) => ({
			label: formula.queryName,
			value: formula.queryName,
		}));
		return [...queries, ...formulas];
	}, [currentQuery]);

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
					<Typography.Text className="sentence-text">
						Send notification when the observed value for
					</Typography.Text>
					<Select
						value={thresholdState.selectedQuery}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_SELECTED_QUERY',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={queryNames}
					/>
					<Typography.Text className="sentence-text">
						during the last
					</Typography.Text>
					<Select
						value={thresholdState.evaluationWindow}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_EVALUATION_WINDOW',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANAMOLY_TIME_DURATION_OPTIONS}
					/>
				</div>
				{/* Sentence 2 */}
				<div className="alert-condition-sentence">
					<Typography.Text className="sentence-text">is</Typography.Text>
					<Select
						value={thresholdState.thresholds[0].thresholdValue}
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
					<Typography.Text className="sentence-text">deviations</Typography.Text>
					<Select
						value={thresholdState.operator}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_OPERATOR',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_THRESHOLD_OPERATOR_OPTIONS}
					/>
					<Typography.Text className="sentence-text">
						the predicted data
					</Typography.Text>
					<Select
						value={thresholdState.matchType}
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
					<Typography.Text className="sentence-text">using the</Typography.Text>
					<Select
						value={thresholdState.algorithm}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_ALGORITHM',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_ALGORITHM_OPTIONS}
					/>
					<Typography.Text className="sentence-text">algorithm with</Typography.Text>
					<Select
						value={thresholdState.seasonality}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_SEASONALITY',
								payload: value,
							});
						}}
						style={{ width: 80 }}
						options={ANOMALY_SEASONALITY_OPTIONS}
					/>
					<Typography.Text className="sentence-text">seasonality</Typography.Text>
				</div>
			</div>
		</div>
	);
}

export default AnomalyThreshold;
