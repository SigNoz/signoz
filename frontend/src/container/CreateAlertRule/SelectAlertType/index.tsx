import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { AlertTypeCard, AlertTypeCards, SelectTypeContainer } from './styles';

function SelectAlertType({ onSelect }: SelectAlertTypeProps): JSX.Element {
	const { t } = useTranslation(['alerts']);
	return (
		<SelectTypeContainer>
			<h3> {t('choose_alert_type')} </h3>
			<AlertTypeCards>
				<AlertTypeCard
					title={t('metric_based_alert')}
					onClick={(): void => {
						onSelect(AlertTypes.METRICS_BASED_ALERT);
					}}
				>
					{' '}
					{t('metric_based_alert_desc')}
				</AlertTypeCard>
				<AlertTypeCard
					title={t('log_based_alert')}
					onClick={(): void => {
						onSelect(AlertTypes.LOGS_BASED_ALERT);
					}}
				>
					{' '}
					{t('log_based_alert_desc')}
				</AlertTypeCard>
				<AlertTypeCard
					title={t('traces_based_alert')}
					onClick={(): void => {
						onSelect(AlertTypes.TRACES_BASED_ALERT);
					}}
				>
					{' '}
					{t('traces_based_alert_desc')}
				</AlertTypeCard>
			</AlertTypeCards>
		</SelectTypeContainer>
	);
}

interface SelectAlertTypeProps {
	onSelect: (typ: AlertTypes) => void;
}

export default SelectAlertType;
