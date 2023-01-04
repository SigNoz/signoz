import { sortBy } from 'lodash-es';
import { TSortVariableValuesType } from 'types/api/dashboard/getAll';

type TValuesDataType = (string | number | boolean)[];
const sortValues = (
	values: TValuesDataType,
	sortType: TSortVariableValuesType,
): TValuesDataType => {
	if (sortType === 'ASC') return sortBy(values);
	if (sortType === 'DESC') return sortBy(values).reverse();

	return values;
};

export default sortValues;
