import './styles.scss';

import { Button, Popover } from 'antd';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { useCreateAlertState } from '../context';
import EvaluationWindowPopover from './EvaluationWindowPopover';
import { getEvaluationWindowTypeText, getTimeframeText } from './utils';

function EvaluationSettings(): JSX.Element {
	const { evaluationWindow, setEvaluationWindow } = useCreateAlertState();

	const [
		isEvaluationWindowPopoverOpen,
		setIsEvaluationWindowPopoverOpen,
	] = useState(false);

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
