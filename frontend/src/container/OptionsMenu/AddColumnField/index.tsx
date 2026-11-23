import { useTranslation } from 'react-i18next';
import { Search } from '@signozhq/icons';
import { Input, Spin } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { useIsDarkMode } from 'hooks/useDarkMode';

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
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{t('options_menu.addColumn')}
			</Typography>

			<Input.Group compact>
				<AddColumnSelect
					loading={config.isFetching}
					size="small"
					mode="multiple"
					placeholder="Search"
					options={config.options}
					value={[]}
					onSelect={config.onSelect}
					onSearch={config.onSearch}
					onFocus={config.onFocus}
					onBlur={config.onBlur}
					notFoundContent={config.isFetching ? <Spin size="small" /> : null}
				/>
				<SearchIconWrapper $isDarkMode={isDarkMode}>
					<Search size="md" />
				</SearchIconWrapper>
			</Input.Group>

			{config.value?.map(({ name }) => (
				<AddColumnItem direction="horizontal" key={name}>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						{name}
					</Typography>
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
