import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { MetricsType } from 'container/MetricsApplication/constant';
import { ILog } from 'types/api/logs/log';

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
