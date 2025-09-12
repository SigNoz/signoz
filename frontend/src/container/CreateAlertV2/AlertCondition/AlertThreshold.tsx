import './styles.scss';

import { Button, Select, Typography } from 'antd';
import getAllChannels from 'api/channels/getAll';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Plus } from 'lucide-react';
import { useQuery } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { Channels } from 'types/api/channels/getAll';
import APIError from 'types/api/error';

import { useCreateAlertState } from '../context';
import {
	INITIAL_INFO_THRESHOLD,
	INITIAL_RANDOM_THRESHOLD,
	INITIAL_WARNING_THRESHOLD,
	THRESHOLD_MATCH_TYPE_OPTIONS,
	THRESHOLD_OPERATOR_OPTIONS,
} from '../context/constants';
import ThresholdItem from './ThresholdItem';
import { UpdateThreshold } from './types';
import {
	getCategoryByOptionId,
	getCategorySelectOptionByName,
	getQueryNames,
} from './utils';

function AlertThreshold(): JSX.Element {
	const {
		alertState,
		thresholdState,
		setThresholdState,
	} = useCreateAlertState();
	const { data, isLoading: isLoadingChannels } = useQuery<
		SuccessResponseV2<Channels[]>,
		APIError
	>(['getChannels'], {
		queryFn: () => getAllChannels(),
	});
	const channels = data?.data || [];

	const { currentQuery } = useQueryBuilder();

	const queryNames = getQueryNames(currentQuery);

	const selectedCategory = getCategoryByOptionId(alertState.yAxisUnit || '');
	const categorySelectOptions = getCategorySelectOptionByName(
		selectedCategory || '',
	);

	const addThreshold = (): void => {
		let newThreshold;
		if (thresholdState.thresholds.length === 1) {
			newThreshold = INITIAL_WARNING_THRESHOLD;
		} else if (thresholdState.thresholds.length === 2) {
			newThreshold = INITIAL_INFO_THRESHOLD;
		} else {
			newThreshold = INITIAL_RANDOM_THRESHOLD;
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

	return (
		<div className="alert-threshold-container">
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
				</div>
				<div className="alert-condition-sentence">
					<Select
						value={thresholdState.operator}
						onChange={(value): void => {
							setThresholdState({
								type: 'SET_OPERATOR',
								payload: value,
							});
						}}
						style={{ width: 120 }}
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
						style={{ width: 140 }}
						options={THRESHOLD_MATCH_TYPE_OPTIONS}
					/>
					<Typography.Text className="sentence-text">
						during the <strong>Evaluation Window.</strong>
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
		</div>
	);
}

export default AlertThreshold;
