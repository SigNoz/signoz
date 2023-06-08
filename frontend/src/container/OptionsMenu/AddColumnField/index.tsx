import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTranslation } from 'react-i18next';

import { OptionsMenuConfig } from '..';
import { FieldTitle } from '../styles';
import { AddColumnSelect, AddColumnWrapper, SearchIconWrapper } from './styles';

function AddColumnField({ config }: AddColumnFieldProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);
	const isDarkMode = useIsDarkMode();

	if (!config) return null;

	return (
		<AddColumnWrapper direction="vertical">
			<FieldTitle>{t('options_menu.addColumn')}</FieldTitle>

			<Input.Group compact>
				<AddColumnSelect
					allowClear
					maxTagCount={0}
					size="small"
					mode="multiple"
					placeholder="Search"
					options={config.options}
					value={config.value}
					onChange={config.onChange}
				/>
				<SearchIconWrapper $isDarkMode={isDarkMode}>
					<SearchOutlined />
				</SearchIconWrapper>
			</Input.Group>
		</AddColumnWrapper>
	);
}

interface AddColumnFieldProps {
	config: OptionsMenuConfig['addColumn'];
}

export default AddColumnField;
