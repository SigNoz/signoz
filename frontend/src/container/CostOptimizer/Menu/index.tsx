import { Row } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { MenuOptionTypes } from './options';
import { CardMenuContainer, MenuOptionCard } from './styles';

interface OptionType {
	title: string;
	selection: MenuOptionTypes;
	description: string;
}

function SelectMenuOption({ onSelect }: SelectMenuOptionProps): JSX.Element {
	const { t } = useTranslation(['costOptimizer']);

	const renderOptions = (): JSX.Element => {
		const optionList: OptionType[] = [
			{
				title: t('ingestion_analytics'),
				selection: MenuOptionTypes.INGESTION_ANALYTICS,
				description: t('ingestion_analytics_desc'),
			},
			{
				title: t('manage_drop_rule'),
				selection: MenuOptionTypes.MANAGE_DROP_RULES,
				description: t('manage_drop_rule_desc'),
			},
		];
		return (
			<>
				{optionList.map((o: OptionType) => (
					<MenuOptionCard
						key={o.selection}
						title={o.title}
						onClick={(): void => {
							onSelect(o.selection);
						}}
					>
						{o.description}
					</MenuOptionCard>
				))}
			</>
		);
	};
	return (
		<CardMenuContainer>
			<Row>{renderOptions()}</Row>
		</CardMenuContainer>
	);
}

interface SelectMenuOptionProps {
	onSelect: (typ: MenuOptionTypes) => void;
}

export default SelectMenuOption;
