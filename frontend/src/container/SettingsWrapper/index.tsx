import { Tabs } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleSettingsTab } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer, { SettingTab } from 'types/reducer/app';
const { TabPane } = Tabs;

const SettingsWrapper = ({
	AlertChannels,
	General,
	toggleSettingsTab,
}: SettingsWrapperProps): JSX.Element => {
	const { settingsActiveTab } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const onChangeHandler = useCallback(
		(value: SettingTab) => {
			toggleSettingsTab(value);
			if (value === 'General') {
				history.push(ROUTES.SETTINGS);
			}

			if (value === 'Alert Channels') {
				history.push(ROUTES.ALL_CHANNELS);
			}
		},
		[toggleSettingsTab],
	);

	return (
		<Tabs
			destroyInactiveTabPane
			onChange={(value): void => onChangeHandler(value as SettingTab)}
			activeKey={settingsActiveTab}
		>
			<TabPane tab="General" key="General">
				<General />
			</TabPane>
			<TabPane tab="Alert Channels" key="Alert Channels">
				<AlertChannels />
			</TabPane>
		</Tabs>
	);
};

interface DispatchProps {
	toggleSettingsTab: (props: SettingTab) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleSettingsTab: bindActionCreators(ToggleSettingsTab, dispatch),
});

interface SettingsWrapperProps extends DispatchProps {
	General: () => JSX.Element;
	AlertChannels: () => JSX.Element;
}

export default connect(null, mapDispatchToProps)(SettingsWrapper);
