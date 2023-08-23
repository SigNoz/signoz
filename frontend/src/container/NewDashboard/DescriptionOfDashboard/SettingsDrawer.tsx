import { SettingOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SET_CONFIGURE_DRAWER_VISIBLE } from 'types/actions/dashboard';

import DashboardSettingsContent from '../DashboardSettings';
import { DrawerContainer } from './styles';

function SettingsDrawer(): JSX.Element {
	const visible = useSelector<AppState, boolean>(
		(state) => state?.dashboards?.isConfigureDrawerVisible,
	);

	const dispatch = useDispatch();

	const showDrawer = (): void => {
		dispatch({
			type: SET_CONFIGURE_DRAWER_VISIBLE,
			payload: true,
		});
	};

	const onClose = (): void => {
		dispatch({
			type: SET_CONFIGURE_DRAWER_VISIBLE,
			payload: false,
		});
	};

	return (
		<>
			<Button type="dashed" onClick={showDrawer}>
				<SettingOutlined /> Configure
			</Button>
			<DrawerContainer
				placement="right"
				width="70%"
				onClose={onClose}
				open={visible}
			>
				<DashboardSettingsContent />
			</DrawerContainer>
		</>
	);
}

export default SettingsDrawer;
