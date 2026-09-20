import { SelectProps } from 'antd';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

export type QueryLabelProps = {
	onChange: (value: DataSource) => void;
	/** Defaults to every signal. */
	allowedDataSources?: TelemetrytypesSignalDTO[];
	'data-testid'?: string;
} & Omit<SelectProps, 'onChange'>;
