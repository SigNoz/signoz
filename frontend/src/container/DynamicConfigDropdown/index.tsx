import {
	CaretDownFilled,
	CaretUpFilled,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import { Dropdown, Menu, Space } from 'antd';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import HelpToolTip from './Config';

function DynamicConfigDropdown({
	frontendId,
}: DynamicConfigDropdownProps): JSX.Element {
	const { configs } = useSelector<AppState, AppReducer>((state) => state.app);
	const [isHelpDropDownOpen, setIsHelpDropDownOpen] = useState<boolean>(false);

	const config = Object.values(configs).find(
		(config) => config.FrontendPositionId === frontendId,
	);

	const onToggleHandler = (): void => {
		setIsHelpDropDownOpen(!isHelpDropDownOpen);
	};

	if (!config) {
		return <div />;
	}

	return (
		<Dropdown
			onVisibleChange={onToggleHandler}
			trigger={['click']}
			overlay={
				<Menu style={{ padding: '1rem' }}>
					<HelpToolTip config={config} />
				</Menu>
			}
			visible={isHelpDropDownOpen}
		>
			<Space>
				<QuestionCircleOutlined />
				{!isHelpDropDownOpen ? <CaretDownFilled /> : <CaretUpFilled />}
			</Space>
		</Dropdown>
	);
}

interface DynamicConfigDropdownProps {
	frontendId: string;
}

export default DynamicConfigDropdown;
