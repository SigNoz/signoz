import { SelectProps } from 'antd';
import { DataSource } from 'types/common/queryBuilder';

export type QueryLabelProps = {
	onChange: (value: DataSource) => void;
	isExplorerPanel?: boolean;
} & Omit<SelectProps, 'onChange'>;
