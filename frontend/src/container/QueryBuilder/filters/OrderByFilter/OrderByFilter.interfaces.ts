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
	/** The aggregation is a bare field (a logs or traces heatmap), which Order by then offers. */
	isBareField?: boolean;
};

export type OrderByFilterValue = {
	disabled?: boolean;
	key: string;
	label: string;
	title?: string;
	value: string;
};
