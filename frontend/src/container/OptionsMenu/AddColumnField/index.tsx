import { useTranslation } from 'react-i18next';
import { Search } from '@signozhq/icons';
import { Flex } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { useIsDarkMode } from 'hooks/useDarkMode';

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

	if (!config) {
		return null;
	}

	return (
		<AddColumnWrapper direction="vertical">
			<FieldTitle>{t('options_menu.addColumn')}</FieldTitle>

			<Flex>
				<AddColumnSelect
					loading={config.isFetching}
					multiple
					placeholder="Search"
					items={config.options}
					value={[]}
					onChange={(value): void => {
						const values = value as string[];
						if (values.length > 0) {
							config.onSelect(values[values.length - 1]);
						}
					}}
					emptyPlaceholder={config.isFetching ? 'Loading...' : 'No results'}
				/>
				<SearchIconWrapper $isDarkMode={isDarkMode}>
					<Search size="md" />
				</SearchIconWrapper>
			</Flex>

			{config.value?.map(({ name }) => (
				<AddColumnItem direction="horizontal" key={name}>
					<Typography>{name}</Typography>
					<DeleteOutlinedIcon
						size="md"
						onClick={(): void => config.onRemove(name)}
					/>
				</AddColumnItem>
			))}
		</AddColumnWrapper>
	);
}

interface AddColumnFieldProps {
	config: OptionsMenuConfig['addColumn'];
}

export default AddColumnField;
