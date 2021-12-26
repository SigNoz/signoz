import { PauseCircleFilled, PlayCircleFilled } from '@ant-design/icons';
import { Button } from 'antd';
import GetMinMax from 'lib/getGlobalMinMax';
import history from 'lib/history';
import createQueryParams from 'lib/query/createQueryParamsInObject';
import getParamsInObject from 'lib/query/getParamsInObject';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

const Paused = (): JSX.Element => {
	const params = new URLSearchParams(history.location.search);
	const prePrams = getParamsInObject(params);
	const [isPause, setIsPause] = useState<boolean>(prePrams['paused'] === 'true');

	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const onClickHandler = useCallback(
		(isToUpdatePause = true) => {
			setIsPause((state) => !state);

			const minMax = GetMinMax(globalSelectedTime, [
				parseInt(prePrams['startTime'], 10), //minTime
				parseInt(prePrams['endTime'], 10), //maxTime
			]);

			let updatedPreParams = {
				...prePrams,
			};

			if (isToUpdatePause) {
				updatedPreParams = {
					...prePrams,
					paused: !isPause ? 'true' : 'false',
				};
			}

			const params = createQueryParams({
				...updatedPreParams,
				startTime: minMax.minTime,
				endTime: minMax.maxTime,
			});

			history.push(history.location.pathname + `?${params}`);
		},
		[globalSelectedTime, isPause, prePrams],
	);

	return (
		<Button onClick={(): void => onClickHandler(true)} type="primary">
			{isPause ? <PauseCircleFilled /> : <PlayCircleFilled />}
		</Button>
	);
};

export default Paused;
