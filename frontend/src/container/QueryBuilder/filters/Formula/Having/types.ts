import { HavingFilterTagProps } from 'container/QueryBuilder/shared';
import {
	Having,
	IBuilderFormula,
} from 'types/api/queryBuilder/queryBuilderData';

export type HavingFilterProps = {
	formula: IBuilderFormula;
	onChange: (having: Having[]) => void;
};

export type HavingTagRenderProps = Omit<HavingFilterTagProps, 'onUpdate'>;
