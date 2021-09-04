import { PlusOutlined } from '@ant-design/icons';
import React, { useCallback, useState } from 'react';

import Query from './Query';
import { QueryButton } from './styles';

const QuerySection = (): JSX.Element => {
	const [listQuery, setListQuery] = useState<number>(1);

	const queryOnClickHandler = useCallback(() => {
		setListQuery((number) => number + 1);
	}, []);

	return (
		<div>
			{new Array(listQuery).fill(0).map((e) => (
				<Query key={e} />
			))}
			<QueryButton onClick={queryOnClickHandler} icon={<PlusOutlined />}>
				Query
			</QueryButton>
		</div>
	);
};

export default QuerySection;
