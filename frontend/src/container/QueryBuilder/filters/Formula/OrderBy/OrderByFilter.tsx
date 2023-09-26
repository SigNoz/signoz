import { Select } from 'antd';

import { OrderByProps } from './types';

function OrderByFilter({ formula, onChange }: OrderByProps): JSX.Element {
	console.log({ formula, onChange });
	return <Select mode="tags" style={{ width: '100%' }} />;
}

export default OrderByFilter;
