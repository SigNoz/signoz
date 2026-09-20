import { ReactNode } from 'react';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { MetricsType } from 'container/MetricsApplication/constant';
import { FontSize } from 'container/OptionsMenu/types';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

export interface BodyTitleRendererProps {
	title: string;
	nodeKey: string;
	value: unknown;
	parentIsArray?: boolean;
	handleChangeSelectedView?: ChangeViewFunctionType;
}

export type AnyObject = { [key: string]: any };

export interface FieldRendererProps {
	field: string;
}

export interface IFieldAttributes {
	dataType?: string;
	newField?: string;
	logType?: MetricsType;
}

export interface JSONViewProps {
	logData: ILog;
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

export interface AddToQueryHOCProps {
	fieldKey: string;
	fieldValue: string;
	onAddToQuery: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
		dataType?: DataTypes,
	) => void;
	fontSize: FontSize;
	dataType?: DataTypes;
	children: ReactNode;
}
