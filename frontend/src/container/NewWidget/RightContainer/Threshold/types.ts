import { Dispatch, ReactNode, SetStateAction } from 'react';

type ThresholdOperators = '>' | '<' | '>=' | '<=' | '=';

export type ThresholdProps = {
	index: string;
	thresholdDeleteHandler?: (index: string) => void;
	thresholdOperator?: ThresholdOperators;
	thresholdValue?: number;
	thresholdUnit?: string;
	thresholdColor?: string;
	thresholdFormat?: 'Text' | 'Background';
	isEditEnabled?: boolean;
	setThresholds?: Dispatch<SetStateAction<ThresholdProps[]>>;
};

export type ShowCaseValueProps = {
	width: string;
	value: ReactNode;
};

export type CustomColorProps = {
	color: string;
};

export type ThresholdSelectorProps = {
	thresholds: ThresholdProps[];
	setThresholds: Dispatch<SetStateAction<ThresholdProps[]>>;
};
