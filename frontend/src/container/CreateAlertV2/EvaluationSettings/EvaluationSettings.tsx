import './styles.scss';

import { Button, Popover } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useCreateAlertState } from '../context';
import { INITIAL_EVALUATION_WINDOW_STATE } from '../context/constants';
import { AlertThresholdMatchType } from '../context/types';
import EvaluationWindowPopover from './EvaluationWindowPopover';
import { CumulativeWindowTimeframes } from './types';
import { getEvaluationWindowTypeText, getTimeframeText } from './utils';

function EvaluationSettings(): JSX.Element {
	const {
		evaluationWindow,
		setEvaluationWindow,
		thresholdState,
		setThresholdState,
	} = useCreateAlertState();

	const [
		isEvaluationWindowPopoverOpen,
		setIsEvaluationWindowPopoverOpen,
	] = useState(false);

	const { currentQuery } = useQueryBuilder();

	useEffect(() => {
		// loop through currenttQuery and find the query that matches the selected query
		const query = currentQuery?.builder?.queryData.find(
			(query) => query.queryName === thresholdState.selectedQuery,
		);

		if (query && query.source === 'meter') {
			setEvaluationWindow({
				type: 'SET_WINDOW_TYPE',
				payload: 'cumulative',
			});

			setEvaluationWindow({
				type: 'SET_TIMEFRAME',
				payload: CumulativeWindowTimeframes.CURRENT_DAY,
			});

			setEvaluationWindow({
				type: 'SET_STARTING_AT',
				payload: {
					time: '00:00:00',
					number: '0',
					timezone: 'UTC',
					unit: 'minutes',
				},
			});

			setThresholdState({
				type: 'SET_MATCH_TYPE',
				payload: AlertThresholdMatchType.IN_TOTAL,
			});
		} else {
			setEvaluationWindow({
				type: 'SET_INITIAL_STATE',
				payload: INITIAL_EVALUATION_WINDOW_STATE,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [thresholdState.selectedQuery]);

	const popoverContent = (
		<Popover
			open={isEvaluationWindowPopoverOpen}
			onOpenChange={(visibility: boolean): void => {
				setIsEvaluationWindowPopoverOpen(visibility);
			}}
			content={
				<EvaluationWindowPopover
					evaluationWindow={evaluationWindow}
					setEvaluationWindow={setEvaluationWindow}
				/>
			}
			trigger="click"
			showArrow={false}
		>
			<Button data-testid="evaluation-settings-button">
				<div className="evaluate-alert-conditions-button-left">
					{getTimeframeText(evaluationWindow)}
				</div>
				<div className="evaluate-alert-conditions-button-right">
					<div className="evaluate-alert-conditions-button-right-text">
						{getEvaluationWindowTypeText(evaluationWindow.windowType)}
					</div>
					{isEvaluationWindowPopoverOpen ? (
						<ChevronUp size={16} />
					) : (
						<ChevronDown size={16} />
					)}
				</div>
			</Button>
		</Popover>
	);

	return (
		<div
			className="condensed-evaluation-settings-container"
			data-testid="condensed-evaluation-settings-container"
		>
			{popoverContent}
		</div>
	);
}

export default EvaluationSettings;
