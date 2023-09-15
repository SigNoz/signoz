import { MetricsType } from 'container/MetricsApplication/constant';
import { ILog } from 'types/api/logs/log';

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
