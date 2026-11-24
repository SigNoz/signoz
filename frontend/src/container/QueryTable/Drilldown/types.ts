import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

export interface BreakoutAttributeType {
	key: string;
	/** The picked field's type, in the vocabulary the group-by it becomes is read with. */
	dataType: DataTypes;
	type: string;
}
