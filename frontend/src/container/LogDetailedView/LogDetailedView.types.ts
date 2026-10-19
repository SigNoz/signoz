import { MetricsType } from 'container/MetricsApplication/constant';

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
