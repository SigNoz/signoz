import './styles.scss';
import '../EvaluationSettings/styles.scss';

import { Button, Select, Typography, Tooltip } from 'antd';
import getAllChannels from 'api/channels/getAll';
import classNames from 'classnames';
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
import { AlertThresholdMatchType, AlertThresholdOperator } from '../context/types';
import { showCondensedLayout } from '../utils';
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

	const getMatchTypeTooltip = (matchType: AlertThresholdMatchType, operator: AlertThresholdOperator): React.ReactNode => {
		const handleTooltipClick = (e: React.MouseEvent): void => {
			e.stopPropagation();
		};
		const getOperatorSymbol = (op: AlertThresholdOperator): string => {
			switch (op) {
				case AlertThresholdOperator.IS_ABOVE:
					return '>';
				case AlertThresholdOperator.IS_BELOW:
					return '<';
				case AlertThresholdOperator.IS_EQUAL_TO:
					return '=';
				case AlertThresholdOperator.IS_NOT_EQUAL_TO:
					return '!=';
				default:
					return '>';
			}
		};

		const getOperatorWord = (op: AlertThresholdOperator): string => {
			switch (op) {
				case AlertThresholdOperator.IS_ABOVE:
					return 'exceed';
				case AlertThresholdOperator.IS_BELOW:
					return 'fall below';
				case AlertThresholdOperator.IS_EQUAL_TO:
					return 'equal';
				case AlertThresholdOperator.IS_NOT_EQUAL_TO:
					return 'not equal';
				default:
					return 'exceed';
			}
		};

		const getThresholdValue = (op: AlertThresholdOperator): number => {
			switch (op) {
				case AlertThresholdOperator.IS_ABOVE:
					return 80;
				case AlertThresholdOperator.IS_BELOW:
					return 50;
				case AlertThresholdOperator.IS_EQUAL_TO:
					return 100;
				case AlertThresholdOperator.IS_NOT_EQUAL_TO:
					return 0;
				default:
					return 80;
			}
		};

		const getDataPoints = (matchType: AlertThresholdMatchType, op: AlertThresholdOperator): number[] => {
			switch (matchType) {
				case AlertThresholdMatchType.AT_LEAST_ONCE:
					if (op === AlertThresholdOperator.IS_BELOW) return [60, 45, 40, 55, 35];
					if (op === AlertThresholdOperator.IS_EQUAL_TO) return [95, 100, 105, 90, 100];
					if (op === AlertThresholdOperator.IS_NOT_EQUAL_TO) return [5, 0, 10, 15, 0];
					return [75, 85, 90, 78, 95]; // IS_ABOVE
				case AlertThresholdMatchType.ALL_THE_TIME:
					if (op === AlertThresholdOperator.IS_BELOW) return [45, 40, 35, 42, 38];
					if (op === AlertThresholdOperator.IS_EQUAL_TO) return [100, 100, 100, 100, 100];
					if (op === AlertThresholdOperator.IS_NOT_EQUAL_TO) return [5, 10, 15, 8, 12];
					return [85, 87, 90, 88, 95]; // IS_ABOVE
				case AlertThresholdMatchType.ON_AVERAGE:
					if (op === AlertThresholdOperator.IS_BELOW) return [60, 40, 45, 35, 45]; // avg = 45
					if (op === AlertThresholdOperator.IS_EQUAL_TO) return [95, 105, 100, 95, 105]; // avg = 100
					if (op === AlertThresholdOperator.IS_NOT_EQUAL_TO) return [5, 10, 15, 8, 12]; // avg = 10
					return [75, 85, 90, 78, 95]; // avg = 84.6, IS_ABOVE
				case AlertThresholdMatchType.IN_TOTAL:
					if (op === AlertThresholdOperator.IS_BELOW) return [8, 5, 10, 12, 8]; // sum = 43
					if (op === AlertThresholdOperator.IS_EQUAL_TO) return [20, 20, 20, 20, 20]; // sum = 100
					if (op === AlertThresholdOperator.IS_NOT_EQUAL_TO) return [10, 15, 25, 5, 30]; // sum = 85
					return [10, 15, 25, 5, 30]; // sum = 85, IS_ABOVE
				case AlertThresholdMatchType.LAST:
					if (op === AlertThresholdOperator.IS_BELOW) return [75, 85, 90, 78, 45];
					if (op === AlertThresholdOperator.IS_EQUAL_TO) return [75, 85, 90, 78, 100];
					if (op === AlertThresholdOperator.IS_NOT_EQUAL_TO) return [75, 85, 90, 78, 25];
					return [75, 85, 90, 78, 95]; // IS_ABOVE
				default:
					return [75, 85, 90, 78, 95];
			}
		};

		const operatorSymbol = getOperatorSymbol(operator);
		const operatorWord = getOperatorWord(operator);
		const thresholdValue = getThresholdValue(operator);
		const dataPoints = getDataPoints(matchType, operator);
		switch (matchType) {
			case AlertThresholdMatchType.AT_LEAST_ONCE:
				return (
					<div style={{ fontSize: '12px', lineHeight: '1.5' }} onClick={handleTooltipClick}>
						<div style={{ marginBottom: '8px' }}>
							Data is aggregated at each interval within your evaluation window, creating multiple data points.
							This option triggers if <span style={{ backgroundColor: 'rgba(24, 144, 255, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>ANY</span> of those aggregated data points crosses the threshold.
						</div>
						<div style={{ marginBottom: '8px', color: '#8B92A0' }}>
							<strong>Example:</strong><br />
							Say, For a 5-minute window (configured in Evaluation settings), 1 min aggregation interval (set up in query) → 5 data points: [{dataPoints.join(', ')}]<br />
							With threshold {operatorSymbol} {thresholdValue}: Alert triggers ({dataPoints.filter(p => {
								switch (operator) {
									case AlertThresholdOperator.IS_ABOVE: return p > thresholdValue;
									case AlertThresholdOperator.IS_BELOW: return p < thresholdValue;
									case AlertThresholdOperator.IS_EQUAL_TO: return p === thresholdValue;
									case AlertThresholdOperator.IS_NOT_EQUAL_TO: return p !== thresholdValue;
									default: return p > thresholdValue;
								}
							}).length} points {operatorWord} {thresholdValue})
						</div>
						<div style={{ marginTop: '8px' }}>
							<a href="https://signoz.io/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#1890FF', fontSize: '11px' }}>Learn more</a>
						</div>
					</div>
				);

			case AlertThresholdMatchType.ALL_THE_TIME:
				return (
					<div style={{ fontSize: '12px', lineHeight: '1.5' }} onClick={handleTooltipClick}>
						<div style={{ marginBottom: '8px' }}>
							Data is aggregated at each interval within your evaluation window, creating multiple data points.
							This option triggers if <span style={{ backgroundColor: 'rgba(24, 144, 255, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>ALL</span> aggregated data points cross the threshold.
						</div>
						<div style={{ marginBottom: '8px', color: '#8B92A0' }}>
							<strong>Example:</strong><br />
							Say, For a 5-minute window (configured in Evaluation settings), 1 min aggregation interval (set up in query) → 5 data points: [{dataPoints.join(', ')}]<br />
							With threshold {operatorSymbol} {thresholdValue}: Alert triggers (all points {operatorWord} {thresholdValue})<br />
							If any point was {operator === AlertThresholdOperator.IS_ABOVE ? '≤' : operator === AlertThresholdOperator.IS_BELOW ? '≥' : operator === AlertThresholdOperator.IS_EQUAL_TO ? '!=' : '='}{thresholdValue}, no alert would fire
						</div>
						<div style={{ marginTop: '8px' }}>
							<a href="https://signoz.io/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#1890FF', fontSize: '11px' }}>Learn more</a>
						</div>
					</div>
				);

			case AlertThresholdMatchType.ON_AVERAGE:
				return (
					<div style={{ fontSize: '12px', lineHeight: '1.5' }} onClick={handleTooltipClick}>
						<div style={{ marginBottom: '8px' }}>
							Data is aggregated at each interval within your evaluation window, creating multiple data points.
							This option triggers if the <span style={{ backgroundColor: 'rgba(24, 144, 255, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>AVERAGE</span> of all aggregated data points crosses the threshold.
						</div>
						<div style={{ marginBottom: '8px', color: '#8B92A0' }}>
							<strong>Example:</strong><br />
							Say, For a 5-minute window (configured in Evaluation settings), 1 min aggregation interval (set up in query) → 5 data points: [{dataPoints.join(', ')}]<br />
							With threshold {operatorSymbol} {thresholdValue}: Alert triggers (average = {(dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length).toFixed(1)})
						</div>
						<div style={{ marginTop: '8px' }}>
							<a href="https://signoz.io/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#1890FF', fontSize: '11px' }}>Learn more</a>
						</div>
					</div>
				);

			case AlertThresholdMatchType.IN_TOTAL:
				return (
					<div style={{ fontSize: '12px', lineHeight: '1.5' }} onClick={handleTooltipClick}>
						<div style={{ marginBottom: '8px' }}>
							Data is aggregated at each interval within your evaluation window, creating multiple data points.
							This option triggers if the <span style={{ backgroundColor: 'rgba(24, 144, 255, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>SUM</span> of all aggregated data points crosses the threshold.
						</div>
						<div style={{ marginBottom: '8px', color: '#8B92A0' }}>
							<strong>Example:</strong><br />
							Say, For a 5-minute window (configured in Evaluation settings), 1 min aggregation interval (set up in query) → 5 {matchType === AlertThresholdMatchType.IN_TOTAL ? 'error counts' : 'data points'}: [{dataPoints.join(', ')}]<br />
							With threshold {operatorSymbol} {thresholdValue}: Alert triggers (total = {dataPoints.reduce((a, b) => a + b, 0)})
						</div>
						<div style={{ marginTop: '8px' }}>
							<a href="https://signoz.io/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#1890FF', fontSize: '11px' }}>Learn more</a>
						</div>
					</div>
				);

			case AlertThresholdMatchType.LAST:
				return (
					<div style={{ fontSize: '12px', lineHeight: '1.5' }} onClick={handleTooltipClick}>
						<div style={{ marginBottom: '8px' }}>
							Data is aggregated at each interval within your evaluation window, creating multiple data points.
							This option triggers based on the <span style={{ backgroundColor: 'rgba(24, 144, 255, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>MOST RECENT</span> aggregated data point only.
						</div>
						<div style={{ marginBottom: '8px', color: '#8B92A0' }}>
							<strong>Example:</strong><br />
							Say, For a 5-minute window (configured in Evaluation settings), 1 min aggregation interval (set up in query) → 5 data points: [{dataPoints.join(', ')}]<br />
							With threshold {operatorSymbol} {thresholdValue}: Alert triggers (last point = {dataPoints[dataPoints.length - 1]})
						</div>
						<div style={{ marginTop: '8px' }}>
							<a href="https://signoz.io/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#1890FF', fontSize: '11px' }}>Learn more</a>
						</div>
					</div>
				);

			default:
				return '';
		}
	};

	const matchTypeOptionsWithTooltips = THRESHOLD_MATCH_TYPE_OPTIONS.map(option => ({
		...option,
		label: (
			<Tooltip 
				title={getMatchTypeTooltip(option.value, thresholdState.operator)} 
				placement="left"
				overlayClassName="copyable-tooltip"
				overlayStyle={{ 
					maxWidth: '450px',
					minWidth: '400px'
				}}
				overlayInnerStyle={{
					padding: '12px 16px',
					userSelect: 'text',
					WebkitUserSelect: 'text',
					MozUserSelect: 'text',
					msUserSelect: 'text'
				}}
				mouseEnterDelay={0.2}
				trigger={['hover', 'click']}
				destroyTooltipOnHide={false}
			>
				<span style={{ display: 'block', width: '100%' }}>{option.label}</span>
			</Tooltip>
		),
	}));
	const { data, isLoading: isLoadingChannels } = useQuery<
		SuccessResponseV2<Channels[]>,
		APIError
	>(['getChannels'], {
		queryFn: () => getAllChannels(),
	});
	const showCondensedLayoutFlag = showCondensedLayout();
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
		<div
			className={classNames('alert-threshold-container', {
				'condensed-alert-threshold-container': showCondensedLayoutFlag,
			})}
		>
			{/* Main condition sentence - combined into one row */}
			<div className="alert-condition-sentence-compact">
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
					className="query-select-compact"
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
					className="operator-select-compact"
					options={THRESHOLD_OPERATOR_OPTIONS}
				/>
				<Typography.Text className="sentence-text">
					the threshold
				</Typography.Text>
				<Select
					value={thresholdState.matchType}
					onChange={(value): void => {
						setThresholdState({
							type: 'SET_MATCH_TYPE',
							payload: value,
						});
					}}
					className="match-type-select-compact"
					options={matchTypeOptionsWithTooltips}
				/>
				<Typography.Text className="sentence-text">during the Evaluation Window</Typography.Text>
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
						operator={thresholdState.operator}
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
