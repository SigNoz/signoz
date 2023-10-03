import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const typeToArrayTypeMapper: { [key in DataTypes]: DataTypes } = {
	[DataTypes.String]: DataTypes.ArrayString,
	[DataTypes.Float64]: DataTypes.ArrayFloat64,
	[DataTypes.Int64]: DataTypes.ArrayInt64,
	[DataTypes.bool]: DataTypes.ArrayBool,
	[DataTypes.EMPTY]: DataTypes.EMPTY,
	[DataTypes.ArrayFloat64]: DataTypes.ArrayFloat64,
	[DataTypes.ArrayInt64]: DataTypes.ArrayInt64,
	[DataTypes.ArrayString]: DataTypes.ArrayString,
	[DataTypes.ArrayBool]: DataTypes.ArrayBool,
};
