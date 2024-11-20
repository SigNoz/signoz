import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dispatch, ReactNode, SetStateAction } from 'react';
import { ColumnUnit } from 'types/api/dashboard/getAll';

export type ThresholdOperators = '>' | '<' | '>=' | '<=' | '=';

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
	thresholdTableOptions?: string;
	setThresholds?: Dispatch<SetStateAction<ThresholdProps[]>>;
	moveThreshold: (dragIndex: number, hoverIndex: number) => void;
	selectedGraph: PANEL_TYPES;
	tableOptions?: Array<{ value: string; label: string }>;
	columnUnits?: ColumnUnit;
};

export type ShowCaseValueProps = {
	width?: string;
	value: ReactNode;
	className?: string;
};

export type CustomColorProps = {
	color: string;
};

export type ThresholdSelectorProps = {
	yAxisUnit: string;
	thresholds: ThresholdProps[];
	setThresholds: Dispatch<SetStateAction<ThresholdProps[]>>;
	selectedGraph: PANEL_TYPES;
	columnUnits: ColumnUnit;
};
