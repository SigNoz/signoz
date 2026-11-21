import type { SelectProps } from 'antd';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';
import type { DataSource } from 'types/common/queryBuilder';

export type QueryLabelProps = {
	onChange: (value: DataSource) => void;
	/** Defaults to every signal. */
	allowedDataSources?: TelemetrytypesSignalDTO[];
	'data-testid'?: string;
} & Omit<SelectProps, 'onChange'>;
