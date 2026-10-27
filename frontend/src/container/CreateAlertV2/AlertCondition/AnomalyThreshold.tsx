import { Input } from '@signozhq/ui/input';
import { Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useAppContext } from 'providers/App/App';

import { useCreateAlertState } from '../context';
import {
	ANOMALY_ALGORITHM_OPTIONS,
	ANOMALY_SEASONALITY_OPTIONS,
	ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS,
	ANOMALY_THRESHOLD_OPERATOR_OPTIONS,
} from '../context/constants';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from '../context/types';
import EvaluationSettings from '../EvaluationSettings/EvaluationSettings';
import { normalizeMatchType, normalizeOperator } from '../utils';
import { AnomalyAndThresholdProps, UpdateThreshold } from './types';
import {
	getQueryNames,
	NotificationChannelsNotFoundContent,
	RoutingPolicyBanner,
} from './utils';

import styles from './AnomalyThreshold.module.scss';

function AnomalyThreshold({
	channels,
	isLoadingChannels,
	isErrorChannels,
	refreshChannels,
}: AnomalyAndThresholdProps): JSX.Element {
	const { user } = useAppContext();
	const {
		thresholdState,
		setThresholdState,
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const { currentQuery } = useQueryBuilder();

	const queryNames = getQueryNames(currentQuery);

	const updateThreshold: UpdateThreshold = (id, field, value) => {
		setThresholdState({
			type: 'SET_THRESHOLDS',
			payload: thresholdState.thresholds.map((t) =>
				t.id === id ? { ...t, [field]: value } : t,
			),
		});
	};

	const threshold = thresholdState.thresholds[0];

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
				<div className="threshold-item">
					<div className="threshold-row">
						<div className="threshold-indicator">
							<div
								className="threshold-dot"
								style={{ backgroundColor: threshold.color }}
							/>
						</div>
						<div className="threshold-controls">
							<Input
								placeholder="Enter threshold name"
								value={threshold.label}
								onChange={(e): void =>
									updateThreshold(threshold.id, 'label', e.target.value)
								}
								className={styles.severityInput}
								data-testid="anomaly-threshold-name-input"
							/>
							<Typography.Text className="sentence-text">at</Typography.Text>
							<Input
								placeholder="Deviations"
								value={threshold.thresholdValue}
								onChange={(e): void =>
									updateThreshold(threshold.id, 'thresholdValue', e.target.value)
								}
								className={styles.deviationInput}
								type="number"
								data-testid="anomaly-threshold-value-input"
							/>
							<Typography.Text data-testid="deviations-text" className="sentence-text">
								deviations
							</Typography.Text>
							{!notificationSettings.routingPolicies && (
								<>
									<Typography.Text className="sentence-text">send to</Typography.Text>
									<Select
										value={threshold.channels}
										data-testid="anomaly-notification-channel-select"
										className={styles.channelSelect}
										onChange={(value): void =>
											updateThreshold(threshold.id, 'channels', value)
										}
										options={channels.map((channel) => ({
											value: channel.name,
											label: channel.name,
										}))}
										mode="multiple"
										placeholder="Select notification channels"
										showSearch
										maxTagCount={2}
										maxTagPlaceholder={(omittedValues): string =>
											`+${omittedValues.length} more`
										}
										maxTagTextLength={10}
										filterOption={(input, option): boolean =>
											option?.label?.toLowerCase().includes(input.toLowerCase()) || false
										}
										status={isErrorChannels ? 'error' : undefined}
										disabled={isLoadingChannels}
										notFoundContent={
											<NotificationChannelsNotFoundContent
												user={user}
												refreshChannels={refreshChannels}
											/>
										}
									/>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
			<RoutingPolicyBanner
				notificationSettings={notificationSettings}
				setNotificationSettings={setNotificationSettings}
			/>
		</div>
	);
}

export default AnomalyThreshold;
