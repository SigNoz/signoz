import { SettingFilled, SettingOutlined } from '@ant-design/icons';
import { Popover, Space } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AddColumnField from './AddColumnField';
import FormatField from './FormatField';
import MaxLinesField from './MaxLinesField';
import { OptionsContainer, OptionsContentWrapper } from './styles';
import { OptionsMenuConfig } from './types';
import useOptionsMenu from './useOptionsMenu';

interface OptionsMenuProps {
	config: OptionsMenuConfig;
}

function OptionsMenu({ config }: OptionsMenuProps): JSX.Element {
	const { t } = useTranslation(['trace']);
	const isDarkMode = useIsDarkMode();

	const OptionsContent = useMemo(
		() => (
			<OptionsContentWrapper direction="vertical">
				{config?.format && <FormatField config={config.format} />}
				{config?.maxLines && <MaxLinesField config={config.maxLines} />}
				{config?.addColumn && <AddColumnField config={config.addColumn} />}
			</OptionsContentWrapper>
		),
		[config],
	);

	const SettingIcon = isDarkMode ? SettingOutlined : SettingFilled;

	return (
		<OptionsContainer>
			<Popover placement="bottom" trigger="click" content={OptionsContent}>
				<Space align="center">
					{t('options_menu.options')}
					<SettingIcon />
				</Space>
			</Popover>
		</OptionsContainer>
	);
}

export default OptionsMenu;

export { useOptionsMenu };
