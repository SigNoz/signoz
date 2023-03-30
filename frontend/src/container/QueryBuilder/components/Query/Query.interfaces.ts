import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

export type QueryProps = {
	index: number;
	isAvailableToDisable: boolean;
	query: IBuilderQueryForm;
	queryVariant: 'static' | 'dropdown';
};
