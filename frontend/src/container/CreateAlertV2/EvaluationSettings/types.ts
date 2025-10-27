import { Dispatch, SetStateAction } from 'react';

import {
	EvaluationWindowAction,
	EvaluationWindowState,
} from '../context/types';

export interface IAdvancedOptionItemProps {
	title: string;
	description: string;
	input: JSX.Element;
	tooltipText?: string;
	onToggle?: () => void;
	defaultShowInput: boolean;
	'data-testid'?: string;
}

export enum RollingWindowTimeframes {
	'LAST_5_MINUTES' = '5m0s',
	'LAST_10_MINUTES' = '10m0s',
	'LAST_15_MINUTES' = '15m0s',
	'LAST_30_MINUTES' = '30m0s',
	'LAST_1_HOUR' = '1h0m0s',
	'LAST_2_HOURS' = '2h0m0s',
	'LAST_4_HOURS' = '4h0m0s',
}

export enum CumulativeWindowTimeframes {
	'CURRENT_HOUR' = 'currentHour',
	'CURRENT_DAY' = 'currentDay',
	'CURRENT_MONTH' = 'currentMonth',
}

export interface IEvaluationWindowPopoverProps {
	evaluationWindow: EvaluationWindowState;
	setEvaluationWindow: Dispatch<EvaluationWindowAction>;
}

export interface IEvaluationWindowDetailsProps {
	evaluationWindow: EvaluationWindowState;
	setEvaluationWindow: Dispatch<EvaluationWindowAction>;
}

export interface IEvaluationCadenceDetailsProps {
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	setIsCustomScheduleButtonVisible: Dispatch<SetStateAction<boolean>>;
}

export interface IEvaluationCadencePreviewProps {
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export interface TimeInputProps {
	value?: string; // Format: "HH:MM:SS"
	onChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export interface IEditCustomScheduleProps {
	setIsEvaluationCadenceDetailsVisible: (isOpen: boolean) => void;
	setIsPreviewVisible: (isOpen: boolean) => void;
}

export interface IScheduleListProps {
	schedule: Date[] | null;
	currentTimezone: string;
}
