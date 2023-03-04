import {
	CaretDownFilled,
	CaretUpFilled,
	QuestionCircleFilled,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import { Dropdown, Space } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';
import AppReducer from 'types/reducer/app';

import HelpToolTip from './Config';
import { MenuDropdown } from './Config/styles';

function DynamicConfigDropdown({
	frontendId,
}: DynamicConfigDropdownProps): JSX.Element {
	const { configs } = useSelector<AppState, AppReducer>((state) => state.app);
	const isDarkMode = useIsDarkMode();
	const [isHelpDropDownOpen, setIsHelpDropDownOpen] = useState<boolean>(false);

	const currentConfig = useMemo(
		() =>
			Object.values(configs).find(
				(config) => config.frontendPositionId === frontendId,
			),
		[frontendId, configs],
	);

	const onToggleHandler = (): void => {
		setIsHelpDropDownOpen(!isHelpDropDownOpen);
	};
	const menuItems = useMemo(
		() => [
			{
				key: '1',
				label: <HelpToolTip config={config as ConfigProps} />,
			},
		],
		[config],
	);

	if (!config) {
		return <div />;
	}

	const Icon = isDarkMode ? QuestionCircleOutlined : QuestionCircleFilled;
	const DropDownIcon = isHelpDropDownOpen ? CaretUpFilled : CaretDownFilled;

	return (
		<Dropdown
			onVisibleChange={onToggleHandler}
			trigger={['click']}
			overlay={<MenuDropdown items={menuItems} />}
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
