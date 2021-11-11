import React, { useCallback, useState } from 'react';
import { Select, Tag } from 'antd';
import { SelectValue } from 'antd/lib/select';
import getGroupApi from 'api/alerts/getGroup';
import { PayloadProps, Props } from 'types/api/alerts/getGroups';
import { State } from 'hooks/useFetch';

const TriggeredAlerts = () => {
	const [groupState, setGroupState] = useState<State<PayloadProps>>();

	const options = [
		{ value: 'gold', asd: 'asd' },
		{ value: 'lime' },
		{ value: 'green' },
		{ value: 'cyan' },
	];

	const onChangeSelectHandler = useCallback((value: SelectValue, option) => {
		console.log('asd', value, option);
	}, []);

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

export default TriggeredAlerts;
