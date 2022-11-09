import { Select } from 'antd';
import { DASHBOARD_TIME_IN_DURATION } from 'constants/app';
import dayjs from 'dayjs';
import useUrlQuery from 'hooks/useUrlQuery';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

import { options } from './config';
import { SelectContainer } from './styles';

function AutoRefresh({ disabled = false }: AutoRefreshProps): JSX.Element {
	const { minTime: initialMinTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { replace } = useHistory();
	const params = useUrlQuery();

	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [selectedOption, setSelectedOption] = useState<string>(
		params.get(DASHBOARD_TIME_IN_DURATION) || options[0].key,
	);

	const getOption = useMemo(
		() => options.find((option) => option.key === selectedOption),
		[selectedOption],
	);

	useInterval(() => {
		const selectedValue = getOption?.value;

		if (disabled) {
			return;
		}

		if (selectedOption !== 'off' && selectedValue) {
			const min = initialMinTime / 1000000;

			dispatch({
				type: UPDATE_TIME_INTERVAL,
				payload: {
					maxTime: dayjs().valueOf() * 1000000,
					minTime: dayjs(min).subtract(selectedValue, 'second').valueOf() * 1000000,
					selectedTime,
				},
			});
		}
	}, getOption?.value || 0);

	const onChangeHandler = useCallback(
		(value: unknown) => {
			if (typeof value === 'string') {
				setSelectedOption(value);
				params.set(DASHBOARD_TIME_IN_DURATION, value);
				replace({
					search: params.toString(),
				});
			}
		},
		[replace, params],
	);

	return (
		<SelectContainer
			disabled={disabled}
			onChange={onChangeHandler}
			value={selectedOption}
		>
			{options.map((option) => (
				<Select.Option key={option.key} value={option.key}>
					{option.label}
				</Select.Option>
			))}
		</SelectContainer>
	);
}

interface AutoRefreshProps {
	disabled?: boolean;
}

AutoRefresh.defaultProps = {
	disabled: false,
};

export default AutoRefresh;
