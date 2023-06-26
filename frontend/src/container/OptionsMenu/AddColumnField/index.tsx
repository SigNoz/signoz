import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import Typography from 'antd/es/typography/Typography';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTranslation } from 'react-i18next';

import { FieldTitle } from '../styles';
import { OptionsMenuConfig } from '../types';
import {
	AddColumnItem,
	AddColumnSelect,
	AddColumnWrapper,
	DeleteOutlinedIcon,
	SearchIconWrapper,
} from './styles';

function AddColumnField({ config }: AddColumnFieldProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);
	const isDarkMode = useIsDarkMode();

	if (!config) return null;

	return (
		<AddColumnWrapper direction="vertical">
			<FieldTitle>{t('options_menu.addColumn')}</FieldTitle>

			<Input.Group compact>
				<AddColumnSelect
					size="small"
					mode="multiple"
					placeholder="Search"
					options={config.options}
					value={[]}
					onChange={config.onChange}
				/>
				<SearchIconWrapper $isDarkMode={isDarkMode}>
					<SearchOutlined />
				</SearchIconWrapper>
			</Input.Group>

			{config.value.map((selectedValue: string) => {
				const option = config?.options?.find(
					({ value }) => value === selectedValue,
				);

				return (
					<AddColumnItem direction="horizontal" key={option?.value}>
						<Typography>{option?.label}</Typography>
						<DeleteOutlinedIcon
							onClick={(): void => config.onRemove(selectedValue)}
						/>
					</AddColumnItem>
				);
			})}
		</AddColumnWrapper>
	);
}

interface AddColumnFieldProps {
	config: OptionsMenuConfig['addColumn'];
}

export default AddColumnField;
