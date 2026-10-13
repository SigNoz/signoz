import { ReactNode } from 'react';
import { PrecisionOption } from 'components/Graph/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { timePreferenceType } from 'constants/timePreference';
import { QueryTableProps } from 'container/QueryTable/QueryTable.intefaces';
import {
	FillMode,
	LineInterpolation,
	LineStyle,
} from 'lib/uPlotV2/config/types';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { ColumnUnit } from 'types/api/widgets/columnUnit';
import { ThresholdProps } from 'types/api/widgets/threshold';

import { IField } from '../logs/fields';
import { TelemetryFieldKey } from '../v5/queryRange';

export enum LegendPosition {
	BOTTOM = 'bottom',
	RIGHT = 'right',
}

export interface ContextLinkProps {
	id: string;
	url: string;
	label: string;
	// openInNewTab: boolean;
}

export interface ContextLinksData {
	linksData: ContextLinkProps[];
}

export interface IBaseWidget {
	id: string;
	panelTypes: PANEL_TYPES;
	title: ReactNode;
	description: string;
	opacity: string;
	nullZeroValues: string;
	timePreferance: timePreferenceType;
	stepSize?: number;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption; // number of decimals or 'full precision'
	stackedBarChart?: boolean;
	bucketCount?: number;
	bucketWidth?: number;
	mergeAllActiveQueries?: boolean;
	thresholds?: ThresholdProps[];
	softMin: number | null;
	softMax: number | null;
	fillSpans?: boolean;
	columnUnits?: ColumnUnit;
	selectedLogFields: IField[] | null;
	selectedTracesFields: TelemetryFieldKey[] | null;
	isLogScale?: boolean;
	columnWidths?: Record<string, number>;
	legendPosition?: LegendPosition;
	customLegendColors?: Record<string, string>;
	contextLinks?: ContextLinksData;
	lineInterpolation?: LineInterpolation;
	showPoints?: boolean;
	lineStyle?: LineStyle;
	fillMode?: FillMode;
	spanGaps?: boolean | number;
}

export interface Widgets extends IBaseWidget {
	query: Query;
	renderColumnCell?: QueryTableProps['renderColumnCell'];
	customColTitles?: Record<string, string>;
	hiddenColumns?: string[];
}
