import { Button } from 'antd';
import React, { useCallback } from 'react';

import { Data } from '../index';

const DeleteButton = ({
	name,
	createdBy,
	description,
	key,
	lastUpdatedTime,
	tags,
}: Data): JSX.Element => {
	const onClickHandler = useCallback(() => {
		console.log({ name, createdBy, description, key, lastUpdatedTime, tags });
	}, []);

	return (
		<Button onClick={onClickHandler} type="link">
			Delete
		</Button>
	);
};

export default DeleteButton;
