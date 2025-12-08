import { SearchOutlined } from '@ant-design/icons';
import { Input, Spin } from 'antd';
import { BaseOptionType } from 'antd/es/select';
import FieldVariantBadges from 'components/FieldVariantBadges/FieldVariantBadges';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTranslation } from 'react-i18next';

import { FieldTitle } from '../styles';
import { OptionsMenuConfig } from '../types';
import { getUniqueColumnKey, getVariantCounts } from '../utils';
import {
	AddColumnItem,
	AddColumnSelect,
	AddColumnWrapper,
	DeleteOutlinedIcon,
	Name,
	NameWrapper,
	OptionContent,
	SearchIconWrapper,
} from './styles';

function OptionRenderer(option: BaseOptionType): JSX.Element {
	const { label, data } = option;
	return (
		<OptionContent>
			<span className="option-label">{label}</span>
			{data?.hasMultipleVariants && (
				<FieldVariantBadges
					fieldDataType={data?.fieldDataType}
					fieldContext={data?.fieldContext}
				/>
			)}
		</OptionContent>
	);
}

function AddColumnField({ config }: AddColumnFieldProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);
	const isDarkMode = useIsDarkMode();

	if (!config) return null;

	// Detect which column names have multiple variants in selected columns
	const selectedColumnVariantCounts = getVariantCounts(config.value || []);

	return (
		<AddColumnWrapper direction="vertical">
			<FieldTitle>{t('options_menu.addColumn')}</FieldTitle>

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
					optionRender={OptionRenderer}
				/>
				<SearchIconWrapper $isDarkMode={isDarkMode}>
					<SearchOutlined />
				</SearchIconWrapper>
			</Input.Group>

			{config.value?.map((column) => {
				const uniqueKey = getUniqueColumnKey(column);
				const showBadge = selectedColumnVariantCounts[column.name] > 1;
				return (
					<AddColumnItem key={uniqueKey}>
						<NameWrapper>
							<Name>{column.name}</Name>
							{showBadge && (
								<FieldVariantBadges
									fieldDataType={column.fieldDataType}
									fieldContext={column.fieldContext}
								/>
							)}
						</NameWrapper>
						<DeleteOutlinedIcon onClick={(): void => config.onRemove(uniqueKey)} />
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
