import './AutoRefreshV2.styles.scss';

import { CaretDownFilled } from '@ant-design/icons';
import { Button, Checkbox, Popover, Typography } from 'antd';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import { DASHBOARD_TIME_IN_DURATION } from 'constants/app';
import useUrlQuery from 'hooks/useUrlQuery';
import _omit from 'lodash-es/omit';
import { Check } from 'lucide-react';
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
import { ButtonContainer } from './styles';

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
		(selectedValue: string) => {
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
			placement="bottomRight"
			rootClassName="auto-refresh-root"
			trigger={['click']}
			content={
				<div className="auto-refresh-menu">
					<Checkbox
						onChange={onChangeAutoRefreshHandler}
						checked={isAutoRefreshEnabled}
						disabled={isDisabled}
						className="auto-refresh-checkbox"
					>
						Auto Refresh
					</Checkbox>
					<Typography.Paragraph
						disabled={isDisabled}
						className="refresh-interval-text"
					>
						Refresh Interval
					</Typography.Paragraph>
					{options
						.filter((e) => e.label !== 'off')
						.map((option) => (
							<Button
								type="text"
								className="refresh-interval-btns"
								key={option.label + option.value}
								onClick={(): void => {
									onChangeHandler(option.key);
								}}
							>
								{option.label}
								{option.key === selectedOption && <Check size={14} />}
							</Button>
						))}
				</div>
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
