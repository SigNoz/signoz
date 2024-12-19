import { SettingFilled, SettingOutlined } from '@ant-design/icons';
import { Popover, Space } from 'antd';
import { OptionFormatTypes } from 'constants/optionsFormatTypes';
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
	selectedOptionFormat?: string;
	config: OptionsMenuConfig;
}

function OptionsMenu({
	selectedOptionFormat,
	config,
}: OptionsMenuProps): JSX.Element {
	const { t } = useTranslation(['trace']);
	const isDarkMode = useIsDarkMode();

	const OptionsContent = useMemo(
		() => (
			<OptionsContentWrapper direction="vertical">
				{config?.format && <FormatField config={config.format} />}
				{selectedOptionFormat === OptionFormatTypes.RAW && config?.maxLines && (
					<MaxLinesField config={config.maxLines} />
				)}
				{config?.addColumn && <AddColumnField config={config.addColumn} />}
			</OptionsContentWrapper>
		),
		[config, selectedOptionFormat],
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

OptionsMenu.defaultProps = {
	selectedOptionFormat: 'raw',
};

export { useOptionsMenu };
