import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { QueryLabelProps } from '../QueryLabel/QueryLabel.interfaces';

export type QueryProps = {
	index: number;
	isAvailableToDisable: boolean;
	query: IBuilderQueryForm;
	queryVariant: QueryLabelProps['variant'];
};
