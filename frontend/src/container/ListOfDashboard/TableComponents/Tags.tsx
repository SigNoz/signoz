import { Tag } from 'antd';
import React from 'react';

import { Data } from '../index';

const Tags = (props: Data['tags']): JSX.Element => {
	return (
		<>
			{props.map((e) => (
				<Tag key={e}>{e}</Tag>
			))}
		</>
	);
};

export default Tags;
