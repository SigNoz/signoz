import { Row } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { AlertTypeCard, SelectTypeContainer } from './styles';

interface OptionType {
	title: string;
	selection: AlertTypes;
	description: string;
}

function SelectAlertType({ onSelect }: SelectAlertTypeProps): JSX.Element {
	const { t } = useTranslation(['alerts']);

	const renderOptions = (): JSX.Element => {
		const optionList: OptionType[] = [
			{
				title: t('metric_based_alert'),
				selection: AlertTypes.METRICS_BASED_ALERT,
				description: t('metric_based_alert_desc'),
			},
			{
				title: t('log_based_alert'),
				selection: AlertTypes.LOGS_BASED_ALERT,
				description: t('log_based_alert_desc'),
			},
			{
				title: t('traces_based_alert'),
				selection: AlertTypes.TRACES_BASED_ALERT,
				description: t('traces_based_alert_desc'),
			},
			{
				title: t('exceptions_based_alert'),
				selection: AlertTypes.EXCEPTIONS_BASED_ALERT,
				description: t('exceptions_based_alert_desc'),
			},
		];
		return (
			<>
				{optionList.map((o: OptionType) => (
					<AlertTypeCard
						key={o.selection}
						title={o.title}
						onClick={(): void => {
							onSelect(o.selection);
						}}
					>
						{o.description}
					</AlertTypeCard>
				))}
			</>
		);
	};
	return (
		<SelectTypeContainer>
			<h3> {t('choose_alert_type')} </h3>
			<Row>{renderOptions()}</Row>
		</SelectTypeContainer>
	);
}

interface SelectAlertTypeProps {
	onSelect: (typ: AlertTypes) => void;
}

export default SelectAlertType;
