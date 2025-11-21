import { PrecisionOption } from 'components/Graph/yAxisConfig';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { QueryTableProps } from 'container/QueryTable/QueryTable.intefaces';
import { ReactNode } from 'react';
import { Layout } from 'react-grid-layout';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { IField } from '../logs/fields';
import { TelemetryFieldKey } from '../v5/queryRange';

export const VariableQueryTypeArr = [
	'QUERY',
	'TEXTBOX',
	'CUSTOM',
	'DYNAMIC',
] as const;
export type TVariableQueryType = typeof VariableQueryTypeArr[number];

export const VariableSortTypeArr = ['DISABLED', 'ASC', 'DESC'] as const;
export type TSortVariableValuesType = typeof VariableSortTypeArr[number];

export enum LegendPosition {
	BOTTOM = 'bottom',
	RIGHT = 'right',
}

export interface IDashboardVariable {
	id: string;
	order?: any;
	name?: string; // key will be the source of truth
	description: string;
	type: TVariableQueryType;
	// Query
	queryValue?: string;
	// Custom
	customValue?: string;
	// Textbox
	textboxValue?: string;

	sort: TSortVariableValuesType;
	multiSelect: boolean;
	showALLOption: boolean;
	selectedValue?:
		| null
		| string
		| number
		| boolean
		| (string | number | boolean)[];
	// Internal use
	modificationUUID?: string;
	allSelected?: boolean;
	change?: boolean;
	defaultValue?: string;
	dynamicVariablesAttribute?: string;
	dynamicVariablesSource?: string;
	haveCustomValuesSelected?: boolean;
}
export interface Dashboard {
	id: string;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	updatedBy: string;
	data: DashboardData;
	locked?: boolean;
}

export interface PayloadProps {
	data: Dashboard[];
	status: string;
}

export interface DashboardTemplate {
	name: string;
	icon: React.ReactElement;
	id: string;
	description: string;
	previewImage: string;
}

export interface DashboardData {
	// uuid?: string;
	description?: string;
	tags?: string[];
	name?: string;
	widgets?: Array<WidgetRow | Widgets>;
	title: string;
	layout?: Layout[];
	panelMap?: Record<string, { widgets: Layout[]; collapsed: boolean }>;
	variables: Record<string, IDashboardVariable>;
	version?: string;
	image?: string;
}

export interface WidgetRow {
	id: string;
	panelTypes: PANEL_GROUP_TYPES;
	title: ReactNode;
	description: string;
}

export interface ColumnUnit {
	[key: string]: string;
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
}
export interface Widgets extends IBaseWidget {
	query: Query;
	renderColumnCell?: QueryTableProps['renderColumnCell'];
	customColTitles?: Record<string, string>;
	hiddenColumns?: string[];
}

export interface PromQLWidgets extends IBaseWidget {
	query: { query: string; legend: string }[];
}

export interface IQueryBuilderTagFilterItems {
	id: string;
	key: string;
	op: string;
	value: string[];
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
