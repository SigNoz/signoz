import { Button } from 'antd';
import React, { useState } from 'react';
import { PlayCircleFilled, PauseCircleFilled } from '@ant-design/icons';

const Paused = () => {
	const [isPause, setIsPause] = useState<boolean>(false);

	const onClickHandler = () => {
		setIsPause((state) => !state);
	};

	return (
		<Button onClick={onClickHandler} type="primary">
			{isPause ? <PauseCircleFilled /> : <PlayCircleFilled />}
		</Button>
	);
};

export default Paused;
