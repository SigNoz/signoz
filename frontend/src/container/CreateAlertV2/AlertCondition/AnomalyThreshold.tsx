import { Button } from '@signozhq/ui/button';
import { Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Plus } from '@signozhq/icons';

import { useCreateAlertState } from '../context';
import {
	ANOMALY_ALGORITHM_OPTIONS,
	ANOMALY_SEASONALITY_OPTIONS,
	ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS,
	ANOMALY_THRESHOLD_OPERATOR_OPTIONS,
	INITIAL_ANOMALY_THRESHOLD,
} from '../context/constants';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from '../context/types';
import EvaluationSettings from '../EvaluationSettings/EvaluationSettings';
import { normalizeMatchType, normalizeOperator } from '../utils';
import ThresholdItem from './ThresholdItem';
import { AnomalyAndThresholdProps } from './types';
import { useThresholdList } from './useThresholdList';
import { getQueryNames, RoutingPolicyBanner } from './utils';

import styles from './AnomalyThreshold.module.scss';

function AnomalyThreshold({
	channels,
	isLoadingChannels,
	isErrorChannels,
	refreshChannels,
}: AnomalyAndThresholdProps): JSX.Element {
	const {
		thresholdState,
		setThresholdState,
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const { currentQuery } = useQueryBuilder();

	const queryNames = getQueryNames(currentQuery);

	const { addThreshold, removeThreshold, updateThreshold } = useThresholdList();

	const handleAddThreshold = (): void => {
		addThreshold({
			thresholdValue: Math.max(
				1,
				INITIAL_ANOMALY_THRESHOLD.thresholdValue - thresholdState.thresholds.length,
			),
		});
	};

	return (
		<div className="anomaly-threshold-container">
			<div className="alert-condition-sentences">
				{/* Sentence 1 */}
				<div className="alert-condition-sentence">
					<Typography.Text data-testid="notification-text" className="sentence-text">
						Send a notification when
					</Typography.Text>
					<Select
						value={thresholdState.selectedQuery}
						data-testid="query-select"
						className={styles.querySelect}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_SELECTED_QUERY',
								payload: value,
							});
						}}
						options={queryNames}
					/>
					<Typography.Text data-testid="threshold-text" className="sentence-text">
						is
					</Typography.Text>
					<Select
						value={
							(normalizeOperator(thresholdState.operator) ??
								thresholdState.operator) as AlertThresholdOperator
						}
						data-testid="operator-select"
						className={styles.operatorSelect}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_OPERATOR',
								payload: value,
							});
						}}
						options={ANOMALY_THRESHOLD_OPERATOR_OPTIONS}
					/>
					<Typography.Text
						data-testid="predicted-data-text"
						className="sentence-text"
					>
						the prediction
					</Typography.Text>
					<Select
						value={
							(normalizeMatchType(thresholdState.matchType) ??
								thresholdState.matchType) as AlertThresholdMatchType
						}
						data-testid="match-type-select"
						className={styles.matchTypeSelect}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_MATCH_TYPE',
								payload: value,
							});
						}}
						options={ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS}
					/>
					<Typography.Text
						data-testid="evaluation-window-text"
						className="sentence-text"
					>
						during the <EvaluationSettings rollingOnly />
					</Typography.Text>
				</div>
				<div className="alert-condition-sentence">
					{/* Sentence 2 */}
					<Typography.Text data-testid="using-the-text" className="sentence-text">
						using the
					</Typography.Text>
					<Select
						value={thresholdState.algorithm}
						data-testid="algorithm-select"
						className={styles.algorithmSelect}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_ALGORITHM',
								payload: value,
							});
						}}
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
						className={styles.seasonalitySelect}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_SEASONALITY',
								payload: value,
							});
						}}
						options={ANOMALY_SEASONALITY_OPTIONS}
					/>
					<Typography.Text data-testid="seasonality-text" className="sentence-text">
						seasonality
					</Typography.Text>
				</div>
			</div>
			{/* Sentence 3 */}
			<div className="thresholds-section">
				{thresholdState.thresholds.map((threshold, index) => (
					<ThresholdItem
						key={threshold.id}
						threshold={threshold}
						updateThreshold={updateThreshold}
						removeThreshold={removeThreshold}
						showRemoveButton={index !== 0 && thresholdState.thresholds.length > 1}
						channels={channels}
						isLoadingChannels={isLoadingChannels}
						units={[]}
						isErrorChannels={isErrorChannels}
						refreshChannels={refreshChannels}
						isAnomaly
					/>
				))}
				<Button
					variant="dashed"
					color="secondary"
					size="md"
					prefix={<Plus size={14} />}
					onClick={handleAddThreshold}
					testId="add-threshold-button"
				>
					Add Threshold
				</Button>
			</div>
			<RoutingPolicyBanner
				notificationSettings={notificationSettings}
				setNotificationSettings={setNotificationSettings}
			/>
		</div>
	);
}

export default AnomalyThreshold;
