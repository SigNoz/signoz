import { SearchOutlined } from '@ant-design/icons';
import { Input, Spin } from 'antd';
import { BaseOptionType } from 'antd/es/select';
import FieldVariantBadges from 'components/FieldVariantBadges/FieldVariantBadges';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { FieldTitle } from '../styles';
import { OptionsMenuConfig } from '../types';
import {
	buildAttributeKey,
	getOptionLabelCounts,
	parseAttributeKey,
} from '../utils';
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

function OptionRenderer({
	option,
	optionsLabelCounts,
}: {
	option: BaseOptionType;
	optionsLabelCounts: Record<string, number>;
}): JSX.Element {
	const { label, data } = option;
	const key = data?.value as string;
	const { name, fieldContext, fieldDataType } = parseAttributeKey(key);
	const hasMultipleVariants = (optionsLabelCounts[name] || 0) > 1;
	return (
		<OptionContent>
			<span className="option-label">{label}</span>
			{hasMultipleVariants && (
				<FieldVariantBadges
					fieldDataType={fieldDataType}
					fieldContext={fieldContext}
				/>
			)}
		</OptionContent>
	);
}

function AddColumnField({ config }: AddColumnFieldProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);
	const isDarkMode = useIsDarkMode();

	const optionsLabelCounts = useMemo(() => {
		if (!config) return {};
		const optionsKeys: { key: string }[] =
			config?.options?.map((option) => ({ key: String(option.value) })) || [];
		const valuesKeys: { key: string }[] =
			config?.value?.map((column) => ({ key: buildAttributeKey(column) })) || [];

		return getOptionLabelCounts([...optionsKeys, ...valuesKeys]);
	}, [config]);

	const renderOption = useCallback(
		function renderOption(option: BaseOptionType): JSX.Element {
			return (
				<OptionRenderer option={option} optionsLabelCounts={optionsLabelCounts} />
			);
		},
		[optionsLabelCounts],
	);

	if (!config) return null;

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
					notFoundContent={config.isFetching ? <Spin size="small" /> : null}
					optionRender={renderOption}
				/>
				<SearchIconWrapper $isDarkMode={isDarkMode}>
					<SearchOutlined />
				</SearchIconWrapper>
			</Input.Group>

			{config.value?.map((column) => {
				const uniqueKey = buildAttributeKey(column);
				const showBadge = (optionsLabelCounts[column.name] || 0) > 1;
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
