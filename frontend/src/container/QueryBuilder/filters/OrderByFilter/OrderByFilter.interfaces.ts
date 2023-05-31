import {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';

export type OrderByFilterProps = {
	query: IBuilderQuery;
	onChange: (values: OrderByPayload[]) => void;
};

export type OrderByFilterValue = {
	disabled: boolean | undefined;
	key: string;
	label: string;
	title: string | undefined;
	value: string;
};
