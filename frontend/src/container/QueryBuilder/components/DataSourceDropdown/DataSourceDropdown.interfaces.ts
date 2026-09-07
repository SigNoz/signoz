import { SelectProps } from 'antd';
import { DataSource } from 'types/common/queryBuilder';

export type QueryLabelProps = {
	onChange: (value: DataSource) => void;
	/** The sources to offer. Overrides `isListViewPanel`; every known source when omitted. */
	supportedDataSources?: DataSource[];
	isListViewPanel?: boolean;
	'data-testid'?: string;
} & Omit<SelectProps, 'onChange'>;
