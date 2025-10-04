import './styles.scss';
import '../EvaluationSettings/styles.scss';

import { Button, Select, Tooltip, Typography } from 'antd';
import classNames from 'classnames';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import getRandomColor from 'lib/getRandomColor';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { v4 } from 'uuid';

import { useCreateAlertState } from '../context';
import {
	INITIAL_INFO_THRESHOLD,
	INITIAL_RANDOM_THRESHOLD,
	INITIAL_WARNING_THRESHOLD,
	THRESHOLD_MATCH_TYPE_OPTIONS,
	THRESHOLD_OPERATOR_OPTIONS,
} from '../context/constants';
import EvaluationSettings from '../EvaluationSettings/EvaluationSettings';
import ThresholdItem from './ThresholdItem';
import { AnomalyAndThresholdProps, UpdateThreshold } from './types';
import {
	getCategoryByOptionId,
	getCategorySelectOptionByName,
	getMatchTypeTooltip,
	getQueryNames,
	RoutingPolicyBanner,
} from './utils';

function AlertThreshold({
	channels,
	isLoadingChannels,
	isErrorChannels,
	refreshChannels,
}: AnomalyAndThresholdProps): JSX.Element {
	const {
		alertState,
		thresholdState,
		setThresholdState,
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const { currentQuery } = useQueryBuilder();

	const queryNames = getQueryNames(currentQuery);

	useEffect(() => {
		if (
			queryNames.length > 0 &&
			!queryNames.some((query) => query.value === thresholdState.selectedQuery)
		) {
			setThresholdState({
				type: 'SET_SELECTED_QUERY',
				payload: queryNames[0].value,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryNames, thresholdState.selectedQuery]);

	const selectedCategory = getCategoryByOptionId(alertState.yAxisUnit || '');
	const categorySelectOptions = getCategorySelectOptionByName(
		selectedCategory || '',
	);

	const addThreshold = (): void => {
		let newThreshold;
		if (thresholdState.thresholds.length === 1) {
			newThreshold = { ...INITIAL_WARNING_THRESHOLD, id: v4() };
		} else if (thresholdState.thresholds.length === 2) {
			newThreshold = { ...INITIAL_INFO_THRESHOLD, id: v4() };
		} else {
			newThreshold = {
				...INITIAL_RANDOM_THRESHOLD,
				id: v4(),
				color: getRandomColor(),
			};
		}
		setThresholdState({
			type: 'SET_THRESHOLDS',
			payload: [...thresholdState.thresholds, newThreshold],
		});
	};

	const removeThreshold = (id: string): void => {
		if (thresholdState.thresholds.length > 1) {
			setThresholdState({
				type: 'SET_THRESHOLDS',
				payload: thresholdState.thresholds.filter((t) => t.id !== id),
			});
		}
	};

	const updateThreshold: UpdateThreshold = (id, field, value) => {
		setThresholdState({
			type: 'SET_THRESHOLDS',
			payload: thresholdState.thresholds.map((t) =>
				t.id === id ? { ...t, [field]: value } : t,
			),
		});
	};

	const onTooltipOpenChange = (open: boolean): void => {
		// Stop propagation of click events on tooltip text to dropdown
		if (open) {
			setTimeout(() => {
				const tooltipElement = document.querySelector(
					'.copyable-tooltip .ant-tooltip-inner',
				);
				if (tooltipElement) {
					tooltipElement.addEventListener(
						'click',
						(e) => {
							e.stopPropagation();
							e.preventDefault();
						},
						true,
					);
					tooltipElement.addEventListener(
						'mousedown',
						(e) => {
							e.stopPropagation();
							e.preventDefault();
						},
						true,
					);
				}
			}, 0);
		}
	};

	const matchTypeOptionsWithTooltips = THRESHOLD_MATCH_TYPE_OPTIONS.map(
		(option) => ({
			...option,
			label: (
				<Tooltip
					title={getMatchTypeTooltip(option.value, thresholdState.operator)}
					placement="left"
					overlayClassName="copyable-tooltip"
					overlayStyle={{
						maxWidth: '450px',
						minWidth: '400px',
					}}
					overlayInnerStyle={{
						padding: '12px 16px',
						userSelect: 'text',
						WebkitUserSelect: 'text',
						MozUserSelect: 'text',
						msUserSelect: 'text',
					}}
					mouseEnterDelay={0.2}
					trigger={['hover', 'click']}
					destroyTooltipOnHide={false}
					onOpenChange={onTooltipOpenChange}
				>
					<span style={{ display: 'block', width: '100%' }}>{option.label}</span>
				</Tooltip>
			),
		}),
	);

	return (
		<div
			className={classNames(
				'alert-threshold-container',
				'condensed-alert-threshold-container',
			)}
		>
			{/* Main condition sentence */}
			<div className="alert-condition-sentences">
				<div className="alert-condition-sentence">
					<Typography.Text className="sentence-text">
						Send a notification when
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
					<Typography.Text className="sentence-text">is</Typography.Text>
					<Select
						value={thresholdState.operator}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_OPERATOR',
								payload: value,
							});
						}}
						style={{ width: 180 }}
						options={THRESHOLD_OPERATOR_OPTIONS}
					/>
					<Typography.Text className="sentence-text">
						the threshold(s)
					</Typography.Text>
					<Select
						value={thresholdState.matchType}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_MATCH_TYPE',
								payload: value,
							});
						}}
						style={{ width: 180 }}
						options={matchTypeOptionsWithTooltips}
					/>
					<Typography.Text className="sentence-text">
						during the <EvaluationSettings />
					</Typography.Text>
				</div>
			</div>

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
						units={categorySelectOptions}
						isErrorChannels={isErrorChannels}
						refreshChannels={refreshChannels}
					/>
				))}
				<Button
					type="dashed"
					icon={<Plus size={16} />}
					onClick={addThreshold}
					className="add-threshold-btn"
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

export default AlertThreshold;
