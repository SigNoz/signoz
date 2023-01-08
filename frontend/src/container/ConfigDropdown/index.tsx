import {
	CaretDownFilled,
	CaretUpFilled,
	QuestionCircleFilled,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import { Dropdown, Menu, Space } from 'antd';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import HelpToolTip from './Config';

function DynamicConfigDropdown({
	frontendId,
}: DynamicConfigDropdownProps): JSX.Element {
	const { configs, isDarkMode } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	const [isHelpDropDownOpen, setIsHelpDropDownOpen] = useState<boolean>(false);

	const config = useMemo(
		() =>
			Object.values(configs).find(
				(config) => config.frontendPositionId === frontendId,
			),
		[frontendId, configs],
	);

	const onToggleHandler = (): void => {
		setIsHelpDropDownOpen(!isHelpDropDownOpen);
	};

	if (!config) {
		return <div />;
	}

	const Icon = isDarkMode ? QuestionCircleOutlined : QuestionCircleFilled;
	const DropDownIcon = isHelpDropDownOpen ? CaretUpFilled : CaretDownFilled;

	return (
		<Dropdown
			onVisibleChange={onToggleHandler}
			trigger={['click']}
			overlay={
				<Menu>
					<HelpToolTip config={config} />
				</Menu>
			}
			visible={isHelpDropDownOpen}
		>
			<Space align="center">
				<Icon
					style={{ fontSize: 26, color: 'white', paddingTop: 26, cursor: 'pointer' }}
				/>
				<DropDownIcon style={{ color: 'white' }} />
			</Space>
		</Dropdown>
	);
}

interface DynamicConfigDropdownProps {
	frontendId: string;
}

export default DynamicConfigDropdown;
