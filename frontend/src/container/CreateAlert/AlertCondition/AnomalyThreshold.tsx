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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						textOverflow="wrap"
						data-testid="notification-text"
					>
						Send a notification when
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						textOverflow="wrap"
						data-testid="threshold-text"
					>
						is
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						textOverflow="wrap"
						data-testid="predicted-data-text"
					>
						the prediction
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						display="flex"
						gap={4}
						textOverflow="wrap"
						data-testid="evaluation-window-text"
					>
						during the <EvaluationSettings rollingOnly />
					</Typography>
				</div>
				<div className="alert-condition-sentence">
					{/* Sentence 2 */}
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						textOverflow="wrap"
						data-testid="using-the-text"
					>
						using the
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						textOverflow="wrap"
						data-testid="algorithm-with-text"
					>
						algorithm with
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="p"
						textOverflow="wrap"
						data-testid="seasonality-text"
					>
						seasonality
					</Typography>
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
