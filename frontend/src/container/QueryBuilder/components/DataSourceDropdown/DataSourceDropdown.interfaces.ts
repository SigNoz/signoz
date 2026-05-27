import { CSSProperties } from 'react';
import { DataSource } from 'types/common/queryBuilder';

export type QueryLabelProps = {
	onChange: (value: DataSource) => void;
	isListViewPanel?: boolean;
	'data-testid'?: string;
	value?: DataSource;
	style?: CSSProperties;
	className?: string;
};
