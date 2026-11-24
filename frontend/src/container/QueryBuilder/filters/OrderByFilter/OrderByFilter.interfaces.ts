import type { PANEL_TYPES } from 'constants/queryBuilder';
import {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';

export type OrderByFilterProps = {
	query: IBuilderQuery;
	onChange: (values: OrderByPayload[]) => void;
	isRawQuery?: boolean;
	entityVersion?: string;
	isNewQueryV2?: boolean;
	placeholder?: string;
	/** A logs or traces heatmap aggregates a field, which Order by then offers. */
	panelType?: PANEL_TYPES;
};
