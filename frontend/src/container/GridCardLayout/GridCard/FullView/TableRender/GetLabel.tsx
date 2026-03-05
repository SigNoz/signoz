import { TableColumnType as ColumnType } from 'antd';

import { DataSetProps } from '../types';
import Label from './Label';

export const getLabel = (
	labelClickedHandler: (labelIndex: number) => void,
	disabled?: boolean,
): ColumnType<DataSetProps> => ({
	render: (label: string, record): JSX.Element => (
		<Label
			label={label}
			labelIndex={record.index}
			labelClickedHandler={labelClickedHandler}
			disabled={disabled}
		/>
	),
});
