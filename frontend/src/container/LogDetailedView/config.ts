import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const RESTRICTED_SELECTED_FIELDS = ['timestamp', 'id'];

// Fields that can be filtered on but not grouped by in the log details view.
export const RESTRICTED_GROUP_BY_FIELDS = ['body', 'trace_id'];

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
