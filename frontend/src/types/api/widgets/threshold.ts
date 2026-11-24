import { Dispatch, SetStateAction } from 'react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ColumnUnit } from 'types/api/widgets/columnUnit';

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
	thresholdTableOptions?: string;
	setThresholds?: Dispatch<SetStateAction<ThresholdProps[]>>;
	moveThreshold: (dragIndex: number, hoverIndex: number) => void;
	selectedGraph: PANEL_TYPES;
	tableOptions?: Array<{ value: string; label: string }>;
	columnUnits?: ColumnUnit;
	yAxisUnit?: string;
};
