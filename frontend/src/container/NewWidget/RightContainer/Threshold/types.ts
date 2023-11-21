import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dispatch, ReactNode, SetStateAction } from 'react';

type ThresholdOperators = '>' | '<' | '>=' | '<=' | '=';

export type ThresholdProps = {
	index: string;
	keyIndex: number;
	thresholdDeleteHandler?: (index: string) => void;
	thresholdOperator?: ThresholdOperators;
	thresholdValue?: number;
	thresholdUnit?: string;
	thresholdColor?: string;
	thresholdFormat?: 'Text' | 'Background';
	isEditEnabled?: boolean;
	thresholdLabel?: string;
	setThresholds?: Dispatch<SetStateAction<ThresholdProps[]>>;
	moveThreshold: (dragIndex: number, hoverIndex: number) => void;
	selectedGraph: PANEL_TYPES;
};

export type ShowCaseValueProps = {
	width: string;
	value: ReactNode;
};

export type CustomColorProps = {
	color: string;
};

export type ThresholdSelectorProps = {
	yAxisUnit: string;
	thresholds: ThresholdProps[];
	setThresholds: Dispatch<SetStateAction<ThresholdProps[]>>;
	selectedGraph: PANEL_TYPES;
};
