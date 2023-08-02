import { ColumnType } from 'antd/es/table';

import { DataSetProps } from '../types';
import Label from './Label';

export const getLabel = (
	labelClickedHandler: (labelIndex: number) => void,
): ColumnType<DataSetProps> => ({
	render: (label: string, _, index): JSX.Element => (
		<Label
			label={label}
			labelIndex={index}
			labelClickedHandler={labelClickedHandler}
		/>
	),
});
