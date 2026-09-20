import { MetricsType } from 'container/MetricsApplication/constant';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

export type AnyObject = { [key: string]: any };

export interface FieldRendererProps {
	field: string;
}

export interface IFieldAttributes {
	dataType?: string;
	newField?: string;
	logType?: MetricsType;
}

/** One key/field/value row in an attribute table. */
export interface DataType {
	key: string;
	field: string;
	value: string;
}

export interface ActionItemProps {
	fieldKey: string;
	fieldValue: string;
	onClickActionItem: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
		dataType?: DataTypes,
		fieldType?: string,
	) => void;
}
