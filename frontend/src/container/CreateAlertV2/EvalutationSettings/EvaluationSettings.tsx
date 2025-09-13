import './styles.scss';

import { Button, Popover, Typography } from 'antd';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { useCreateAlertState } from '../context';
import Stepper from '../Stepper';
import AdvancedOptions from './AdvancedOptions';
import EvaluationWindowPopover from './EvaluationWindowPopover';
import { getEvaluationWindowTypeText, getTimeframeText } from './utils';

function EvaluationSettings(): JSX.Element {
	const { evaluationWindow, setEvaluationWindow } = useCreateAlertState();
	const [
		isEvaluationWindowPopoverOpen,
		setIsEvaluationWindowPopoverOpen,
	] = useState(false);

	return (
		<div className="evaluation-settings-container">
			<Stepper stepNumber={3} label="Evaluation settings" />
			<div className="evaluate-alert-conditions-container">
				<Typography.Text>Check conditions using data from the last</Typography.Text>
				<div className="evaluate-alert-conditions-separator" />
				<Popover
					open={isEvaluationWindowPopoverOpen}
					onOpenChange={(visibility: boolean): void => {
						setIsEvaluationWindowPopoverOpen(visibility);
					}}
					content={
						<EvaluationWindowPopover
							evaluationWindow={evaluationWindow}
							setEvaluationWindow={setEvaluationWindow}
							isOpen={isEvaluationWindowPopoverOpen}
							setIsOpen={setIsEvaluationWindowPopoverOpen}
						/>
					}
					trigger="click"
					showArrow={false}
				>
					<Button>
						<div className="evaluate-alert-conditions-button-left">
							{getTimeframeText(
								evaluationWindow.windowType,
								evaluationWindow.timeframe,
							)}
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
			</div>
			<AdvancedOptions />
		</div>
	);
}

export default EvaluationSettings;
