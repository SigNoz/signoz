import { useMemo } from 'react';
import { ComboboxSimple } from '@signozhq/ui/combobox';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { useCreateAlertState } from '../context';
import {
	ANOMALY_ALGORITHM_OPTIONS,
	ANOMALY_SEASONALITY_OPTIONS,
	ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS,
	ANOMALY_THRESHOLD_OPERATOR_OPTIONS,
	ANOMALY_TIME_DURATION_OPTIONS,
} from '../context/constants';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from '../context/types';
import { normalizeMatchType, normalizeOperator } from '../utils';
import { AnomalyAndThresholdProps } from './types';
import { getQueryNames, RoutingPolicyBanner } from './utils';

function AnomalyThreshold({
	channels,
	isLoadingChannels,
	isErrorChannels,
}: AnomalyAndThresholdProps): JSX.Element {
	const {
		thresholdState,
		setThresholdState,
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const { currentQuery } = useQueryBuilder();

	const queryNames = getQueryNames(currentQuery);

	const deviationOptions = useMemo(
		() =>
			Array.from({ length: 7 }, (_, i) => ({
				label: (i + 1).toString(),
				value: (i + 1).toString(),
			})),
		[],
	);

	const updateThreshold = (
		id: string,
		field: string,
		value: string | string[],
	): void => {
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
					<SelectSimple
						value={thresholdState.selectedQuery}
						testId="query-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_SELECTED_QUERY',
								payload: value as string,
							});
						}}
						items={queryNames}
					/>
					<Typography.Text
						data-testid="evaluation-window-text"
						className="sentence-text"
					>
						during the last
					</Typography.Text>
					<SelectSimple
						value={thresholdState.evaluationWindow}
						testId="evaluation-window-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_EVALUATION_WINDOW',
								payload: value as string,
							});
						}}
						items={ANOMALY_TIME_DURATION_OPTIONS}
					/>
				</div>
				<div className="alert-condition-sentence">
					{/* Sentence 2 */}
					<Typography.Text data-testid="threshold-text" className="sentence-text">
						is
					</Typography.Text>
					<SelectSimple
						value={thresholdState.thresholds[0].thresholdValue?.toString()}
						testId="threshold-value-select"
						onChange={(value): void => {
							updateThreshold(
								thresholdState.thresholds[0].id,
								'thresholdValue',
								(value as string).toString(),
							);
						}}
						items={deviationOptions}
					/>
					<Typography.Text data-testid="deviations-text" className="sentence-text">
						deviations
					</Typography.Text>
					<SelectSimple
						value={
							(normalizeOperator(thresholdState.operator) ??
								thresholdState.operator) as AlertThresholdOperator
						}
						testId="operator-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_OPERATOR',
								payload: value as AlertThresholdOperator,
							});
						}}
						items={ANOMALY_THRESHOLD_OPERATOR_OPTIONS}
					/>
					<Typography.Text
						data-testid="predicted-data-text"
						className="sentence-text"
					>
						the predicted data
					</Typography.Text>
					<SelectSimple
						value={
							(normalizeMatchType(thresholdState.matchType) ??
								thresholdState.matchType) as AlertThresholdMatchType
						}
						testId="match-type-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_MATCH_TYPE',
								payload: value as AlertThresholdMatchType,
							});
						}}
						items={ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS}
					/>
				</div>
				{/* Sentence 3 */}
				<div className="alert-condition-sentence">
					<Typography.Text data-testid="using-the-text" className="sentence-text">
						using the
					</Typography.Text>
					<SelectSimple
						value={thresholdState.algorithm}
						testId="algorithm-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_ALGORITHM',
								payload: value as string,
							});
						}}
						items={ANOMALY_ALGORITHM_OPTIONS}
					/>
					<Typography.Text
						data-testid="algorithm-with-text"
						className="sentence-text"
					>
						algorithm with
					</Typography.Text>
					<SelectSimple
						value={thresholdState.seasonality}
						testId="seasonality-select"
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_SEASONALITY',
								payload: value as string,
							});
						}}
						items={ANOMALY_SEASONALITY_OPTIONS}
					/>
					{notificationSettings.routingPolicies ? (
						<>
							<Typography.Text
								data-testid="seasonality-text"
								className="sentence-text"
							>
								seasonality to
							</Typography.Text>
							<ComboboxSimple
								value={thresholdState.thresholds[0].channels}
								onChange={(value): void =>
									updateThreshold(
										thresholdState.thresholds[0].id,
										'channels',
										value as string[],
									)
								}
								style={{ width: 350 }}
								items={channels.map((channel) => ({
									value: channel.id,
									label: channel.name,
								}))}
								multiple
								placeholder="Select notification channels"
								loading={isLoadingChannels}
								className={isErrorChannels ? 'error' : undefined}
								emptyPlaceholder="No channels found"
							/>
						</>
					) : (
						<Typography.Text data-testid="seasonality-text" className="sentence-text">
							seasonality
						</Typography.Text>
					)}
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
