import { useState } from 'react';
import { Button, Popover } from 'antd';
import { ChevronDown, ChevronUp } from '@signozhq/icons';

import { useCreateAlertState } from '../context';
import EvaluationWindowPopover from './EvaluationWindowPopover';
import { getEvaluationWindowTypeText, getTimeframeText } from './utils';
import styles from './styles.module.scss';

function EvaluationSettings(): JSX.Element {
	const { evaluationWindow, setEvaluationWindow } = useCreateAlertState();

	const [isEvaluationWindowPopoverOpen, setIsEvaluationWindowPopoverOpen] =
		useState(false);

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
			rootClassName="evaluation-window-popover-overlay"
		>
			<Button data-testid="evaluation-settings-button">
				<div className={styles.evaluateAlertConditionsButtonLeft}>
					{getTimeframeText(evaluationWindow)}
				</div>
				<div className={styles.evaluateAlertConditionsButtonRight}>
					<div className={styles.evaluateAlertConditionsButtonRightText}>
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
			className={styles.condensedEvaluationSettingsContainer}
			data-testid="condensed-evaluation-settings-container"
		>
			{popoverContent}
		</div>
	);
}

export default EvaluationSettings;
