import {
	CaretDownFilled,
	CaretUpFilled,
	QuestionCircleFilled,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import { Space } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';
import AppReducer from 'types/reducer/app';

import HelpToolTip from './Config';
import { ConfigDropdown } from './styles';

function DynamicConfigDropdown({
	frontendId,
}: DynamicConfigDropdownProps): JSX.Element {
	const { configs } = useSelector<AppState, AppReducer>((state) => state.app);
	const isDarkMode = useIsDarkMode();
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

	const menu = useMemo(
		() => ({
			items: [
				{
					key: '1',
					label: <HelpToolTip config={config as ConfigProps} />,
				},
			],
		}),
		[config],
	);

	if (!config) {
		return <div />;
	}

	const Icon = isDarkMode ? QuestionCircleOutlined : QuestionCircleFilled;
	const DropDownIcon = isHelpDropDownOpen ? CaretUpFilled : CaretDownFilled;

	return (
		<ConfigDropdown
			onOpenChange={onToggleHandler}
			trigger={['click']}
			menu={menu}
			open={isHelpDropDownOpen}
		>
			<Space align="center">
				<Icon style={{ fontSize: 26, color: 'white', paddingTop: 26 }} />
				<DropDownIcon style={{ color: 'white' }} />
			</Space>
		</ConfigDropdown>
	);
}

interface DynamicConfigDropdownProps {
	frontendId: string;
}

export default DynamicConfigDropdown;
