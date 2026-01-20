import { Button, Typography } from 'antd';
import classNames from 'classnames';
import { Check } from 'lucide-react';

import {
	EVALUATION_WINDOW_TIMEFRAME,
	EVALUATION_WINDOW_TYPE,
	getCumulativeWindowDescription,
	getRollingWindowDescription,
} from '../constants';
import {
	CumulativeWindowTimeframes,
	IEvaluationWindowPopoverProps,
	RollingWindowTimeframes,
} from '../types';
import EvaluationWindowDetails from './EvaluationWindowDetails';
import { useKeyboardNavigationForEvaluationWindowPopover } from './useKeyboardNavigation';

function EvaluationWindowPopover({
	evaluationWindow,
	setEvaluationWindow,
}: IEvaluationWindowPopoverProps): JSX.Element {
	const {
		containerRef,
		firstItemRef,
	} = useKeyboardNavigationForEvaluationWindowPopover({
		onSelect: (value: string, sectionId: string): void => {
			if (sectionId === 'window-type') {
				setEvaluationWindow({
					type: 'SET_WINDOW_TYPE',
					payload: value as 'rolling' | 'cumulative',
				});
			} else if (sectionId === 'timeframe') {
				setEvaluationWindow({
					type: 'SET_TIMEFRAME',
					payload: value as RollingWindowTimeframes | CumulativeWindowTimeframes,
				});
			}
		},
		onEscape: (): void => {
			const triggerElement = document.querySelector(
				'[aria-haspopup="true"]',
			) as HTMLElement;
			triggerElement?.focus();
		},
	});

	const renderEvaluationWindowContent = (
		label: string,
		contentOptions: Array<{ label: string; value: string }>,
		currentValue: string,
		onChange: (value: string) => void,
		sectionId: string,
	): JSX.Element => (
		<div className="evaluation-window-content-item" data-section-id={sectionId}>
			<Typography.Text className="evaluation-window-content-item-label">
				{label}
			</Typography.Text>
			<div className="evaluation-window-content-list">
				{contentOptions.map((option, index) => (
					<div
						className={classNames('evaluation-window-content-list-item', {
							active: currentValue === option.value,
						})}
						key={option.value}
						role="button"
						tabIndex={0}
						data-value={option.value}
						data-section-id={sectionId}
						onClick={(): void => onChange(option.value)}
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onChange(option.value);
							}
						}}
						ref={index === 0 ? firstItemRef : undefined}
					>
						<Typography.Text>{option.label}</Typography.Text>
						{currentValue === option.value && <Check size={12} />}
					</div>
				))}
			</div>
		</div>
	);

	const renderSelectionContent = (): JSX.Element => {
		if (evaluationWindow.windowType === 'rolling') {
			if (evaluationWindow.timeframe === 'custom') {
				return (
					<EvaluationWindowDetails
						evaluationWindow={evaluationWindow}
						setEvaluationWindow={setEvaluationWindow}
					/>
				);
			}
			return (
				<div className="selection-content">
					<Typography.Text>
						{getRollingWindowDescription(evaluationWindow.timeframe)}
					</Typography.Text>
					<Button type="link">Read the docs</Button>
				</div>
			);
		}

		if (
			evaluationWindow.windowType === 'cumulative' &&
			!evaluationWindow.timeframe
		) {
			return (
				<div className="selection-content">
					<Typography.Text>
						{getCumulativeWindowDescription(evaluationWindow.timeframe)}
					</Typography.Text>
					<Button type="link">Read the docs</Button>
				</div>
			);
		}

		return (
			<EvaluationWindowDetails
				evaluationWindow={evaluationWindow}
				setEvaluationWindow={setEvaluationWindow}
			/>
		);
	};

	return (
		<div
			className="evaluation-window-popover"
			ref={containerRef}
			role="menu"
			aria-label="Evaluation window options"
		>
			<div className="evaluation-window-content">
				{renderEvaluationWindowContent(
					'EVALUATION WINDOW',
					EVALUATION_WINDOW_TYPE,
					evaluationWindow.windowType,
					(value: string): void =>
						setEvaluationWindow({
							type: 'SET_WINDOW_TYPE',
							payload: value as 'rolling' | 'cumulative',
						}),
					'window-type',
				)}
				{renderEvaluationWindowContent(
					'TIMEFRAME',
					EVALUATION_WINDOW_TIMEFRAME[evaluationWindow.windowType],
					evaluationWindow.timeframe,
					(value: string): void =>
						setEvaluationWindow({
							type: 'SET_TIMEFRAME',
							payload: value as RollingWindowTimeframes | CumulativeWindowTimeframes,
						}),
					'timeframe',
				)}
				{renderSelectionContent()}
			</div>
		</div>
	);
}

export default EvaluationWindowPopover;
