import { SelectProps } from 'antd';
import { DataSource } from 'types/common/queryBuilder';

export type QueryLabelProps = {
	onChange: (value: DataSource) => void;
	isListViewPanel?: boolean;
	'data-testid'?: string;
} & Omit<SelectProps, 'onChange'>;
