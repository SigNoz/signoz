import { Row } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { getOptionList } from './config';
import { AlertTypeCard, SelectTypeContainer } from './styles';
import { OptionType } from './types';

function SelectAlertType({ onSelect }: SelectAlertTypeProps): JSX.Element {
	const { t } = useTranslation(['alerts']);

	const optionList = getOptionList(t);

	const renderOptions = useMemo(
		() => (
			<>
				{optionList.map((option: OptionType) => (
					<AlertTypeCard
						key={option.selection}
						title={option.title}
						onClick={(): void => {
							onSelect(option.selection);
						}}
					>
						{option.description}
					</AlertTypeCard>
				))}
			</>
		),
		[onSelect, optionList],
	);

	return (
		<SelectTypeContainer>
			<h3> {t('choose_alert_type')} </h3>
			<Row>{renderOptions}</Row>
		</SelectTypeContainer>
	);
}

interface SelectAlertTypeProps {
	onSelect: (typ: AlertTypes) => void;
}

export default SelectAlertType;
