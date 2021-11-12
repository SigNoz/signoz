import React, { useCallback } from 'react';
import { Select, Tag } from 'antd';
import { SelectValue } from 'antd/lib/select';

const TriggeredAlerts = () => {
	const onChangeSelectHandler = useCallback((value: SelectValue, option) => {
		console.log('asd', value, option);
	}, []);
	const options = [
		{ value: 'gold' },
		{ value: 'lime' },
		{ value: 'green' },
		{ value: 'cyan' },
	];

	return (
		<Select
			allowClear
			onChange={onChangeSelectHandler}
			mode="tags"
			showArrow
			tagRender={(props) => {
				const { label, closable, onClose } = props;
				return (
					<Tag
						color={'magenta'}
						closable={closable}
						onClose={onClose}
						style={{ marginRight: 3 }}
					>
						{label}
					</Tag>
				);
			}}
			options={options}
		/>
	);
};
