import { CaretDownFilled } from '@ant-design/icons';
import {
	Checkbox,
	Divider,
	Popover,
	Radio,
	RadioChangeEvent,
	Space,
	Typography,
} from 'antd';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import { DASHBOARD_TIME_IN_DURATION } from 'constants/app';
import useUrlQuery from 'hooks/useUrlQuery';
import _omit from 'lodash-es/omit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useInterval } from 'react-use';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_AUTO_REFRESH_INTERVAL,
	UPDATE_TIME_INTERVAL,
} from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';
import { popupContainer } from 'utils/selectPopupContainer';

import { getMinMax, options } from './config';
import { ButtonContainer, Container } from './styles';

function AutoRefresh({
	disabled = false,
	showAutoRefreshBtnPrimary = true,
}: AutoRefreshProps): JSX.Element {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { pathname } = useLocation();

	const isDisabled = useMemo(
		() =>
			disabled ||
			globalTime.isAutoRefreshDisabled ||
			globalTime.selectedTime === 'custom',
		[globalTime.isAutoRefreshDisabled, disabled, globalTime.selectedTime],
	);

	const localStorageData = JSON.parse(get(DASHBOARD_TIME_IN_DURATION) || '{}');

	const localStorageValue = useMemo(() => localStorageData[pathname], [
		pathname,
		localStorageData,
	]);

	const [isAutoRefreshEnabled, setIsAutoRefreshfreshEnabled] = useState<boolean>(
		Boolean(localStorageValue),
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	useEffect(() => {
		const isAutoRefreshEnabled = Boolean(localStorageValue);
		dispatch({
			type: UPDATE_AUTO_REFRESH_INTERVAL,
			payload: localStorageValue,
		});
		setIsAutoRefreshfreshEnabled(isAutoRefreshEnabled);
	}, [localStorageValue, dispatch]);

	const params = useUrlQuery();

	const [selectedOption, setSelectedOption] = useState<string>(
		localStorageValue || options[0].key,
	);

	useEffect(() => {
		setSelectedOption(localStorageValue || options[0].key);
	}, [localStorageValue, params]);

	const getOption = useMemo(
		() => options.find((option) => option.key === selectedOption),
		[selectedOption],
	);

	useInterval(() => {
		const selectedValue = getOption?.value;

		if (isDisabled || !isAutoRefreshEnabled) {
			return;
		}

		if (selectedOption !== 'off' && selectedValue) {
			const { maxTime, minTime } = getMinMax(
				globalTime.selectedTime,
				globalTime.minTime,
				globalTime.maxTime,
			);

			dispatch({
				type: UPDATE_TIME_INTERVAL,
				payload: {
					maxTime,
					minTime,
					selectedTime: globalTime.selectedTime,
				},
			});
		}
	}, getOption?.value || 0);

	const onChangeHandler = useCallback(
		(event: RadioChangeEvent) => {
			const selectedValue = event.target.value;
			setSelectedOption(selectedValue);
			params.set(DASHBOARD_TIME_IN_DURATION, selectedValue);
			set(
				DASHBOARD_TIME_IN_DURATION,
				JSON.stringify({ ...localStorageData, [pathname]: selectedValue }),
			);
			setIsAutoRefreshfreshEnabled(true);
		},
		[params, pathname, localStorageData],
	);

	const onChangeAutoRefreshHandler = useCallback(
		(event: CheckboxChangeEvent) => {
			const { checked } = event.target;
			if (!checked) {
				// remove the path from localstorage
				set(
					DASHBOARD_TIME_IN_DURATION,
					JSON.stringify(_omit(localStorageData, pathname)),
				);
			}
			setIsAutoRefreshfreshEnabled(checked);
		},
		[localStorageData, pathname],
	);

	if (globalTime.selectedTime === 'custom') {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}

	return (
		<Popover
			getPopupContainer={popupContainer}
			placement="bottomLeft"
			trigger={['click']}
			content={
				<Container>
					<Checkbox
						onChange={onChangeAutoRefreshHandler}
						checked={isAutoRefreshEnabled}
						disabled={isDisabled}
					>
						Auto Refresh
					</Checkbox>

					<Divider />

					<Typography.Paragraph disabled={isDisabled}>
						Refresh Interval
					</Typography.Paragraph>

					<Radio.Group onChange={onChangeHandler} value={selectedOption}>
						<Space direction="vertical">
							{options
								.filter((e) => e.label !== 'off')
								.map((option) => (
									<Radio disabled={isDisabled} key={option.key} value={option.key}>
										{option.label}
									</Radio>
								))}
						</Space>
					</Radio.Group>
				</Container>
			}
		>
			<ButtonContainer
				title="Set auto refresh"
				type={showAutoRefreshBtnPrimary ? 'primary' : 'default'}
			>
				<CaretDownFilled />
			</ButtonContainer>
		</Popover>
	);
}

interface AutoRefreshProps {
	disabled?: boolean;
	showAutoRefreshBtnPrimary?: boolean;
}

AutoRefresh.defaultProps = {
	disabled: false,
	showAutoRefreshBtnPrimary: true,
};

export default AutoRefresh;
