import './styles.scss';

import { Button, Popover, Typography } from 'antd';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { useCreateAlertState } from '../context';
import Stepper from '../Stepper';
import { showCondensedLayout } from '../utils';
import AdvancedOptions from './AdvancedOptions';
import EvaluationWindowPopover from './EvaluationWindowPopover';
import { getEvaluationWindowTypeText, getTimeframeText } from './utils';

function EvaluationSettings(): JSX.Element {
	const {
		alertType,
		evaluationWindow,
		setEvaluationWindow,
	} = useCreateAlertState();
	const [
		isEvaluationWindowPopoverOpen,
		setIsEvaluationWindowPopoverOpen,
	] = useState(false);
	const showCondensedLayoutFlag = showCondensedLayout();

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
			<Button>
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

	// Layout consists of only the evaluation window popover
	if (showCondensedLayoutFlag) {
		return (
			<div
				className="condensed-evaluation-settings-container"
				data-testid="condensed-evaluation-settings-container"
			>
				{popoverContent}
			</div>
		);
	}

	// Layout consists of
	// - Stepper header
	// - Evaluation window popover
	// - Advanced options
	return (
		<div className="evaluation-settings-container">
			<Stepper stepNumber={3} label="Evaluation settings" />
			{alertType !== AlertTypes.ANOMALY_BASED_ALERT && (
				<div className="evaluate-alert-conditions-container">
					<Typography.Text>Check conditions using data from</Typography.Text>
					<div className="evaluate-alert-conditions-separator" />
					{popoverContent}
				</div>
			)}
			<AdvancedOptions />
		</div>
	);
}

export default EvaluationSettings;
