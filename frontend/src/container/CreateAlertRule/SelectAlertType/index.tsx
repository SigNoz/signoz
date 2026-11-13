import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Row } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { useIsAnomalyDetectionAvailable } from 'container/CreateAlert/useIsAnomalyDetectionAvailable';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { isModifierKeyPressed } from 'utils/app';

import { getOptionList } from './config';
import { AlertTypeCard, SelectTypeContainer } from './styles';
import { OptionType } from './types';

function SelectAlertType({ onSelect }: SelectAlertTypeProps): JSX.Element {
	const { t } = useTranslation(['alerts']);

	const isAnomalyDetectionEnabled = useIsAnomalyDetectionAvailable();

	const optionList = getOptionList(t, isAnomalyDetectionEnabled);

	function getSampleAlertUrl(option: AlertTypes): string {
		let url = '';
		switch (option) {
			case AlertTypes.ANOMALY_BASED_ALERT:
				url = 'https://signoz.io/docs/alerts-management/anomaly-based-alerts/';
				break;
			case AlertTypes.METRICS_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples';
				break;
			case AlertTypes.LOGS_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples';
				break;
			case AlertTypes.TRACES_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples';
				break;
			case AlertTypes.EXCEPTIONS_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/exceptions-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples';
				break;
			default:
				break;
		}

		return url;
	}

	function handleSampleAlertClick(option: AlertTypes): void {
		logEvent('Alert: Sample alert link clicked', {
			dataSource: ALERTS_DATA_SOURCE_MAP[option],
			link: getSampleAlertUrl(option),
			page: 'New alert data source selection page',
		});
	}
	const renderOptions = useMemo(
		() => (
			<>
				{optionList.map((option: OptionType) => (
					<AlertTypeCard
						key={option.selection}
						title={option.title}
						extra={
							option.isBeta ? (
								<Badge variant="solid" color="primary">
									Beta
								</Badge>
							) : undefined
						}
						onClick={(e): void => {
							onSelect(option.selection, isModifierKeyPressed(e));
						}}
						data-testid={`alert-type-card-${option.selection}`}
					>
						{option.description}{' '}
						<Typography.Link
							variant="paragraph"
							size="base"
							weight="regular"
							textOverflow="wrap"
							href={getSampleAlertUrl(option.selection)}
							target="_blank"
							onClick={(e): void => {
								e.stopPropagation();
								handleSampleAlertClick(option.selection);
							}}
						>
							Click here to see how to create a sample alert.
						</Typography.Link>{' '}
					</AlertTypeCard>
				))}
			</>
		),
		[onSelect, optionList],
	);

	return (
		<SelectTypeContainer>
			<Typography
				variant="label"
				size="large"
				weight="bold"
				color="inherit"
				as="h4"
				marginY={4}
				paddingX={4}
				textOverflow="wrap"
			>
				{t('choose_alert_type')}
			</Typography>
			<Row>{renderOptions}</Row>
		</SelectTypeContainer>
	);
}

interface SelectAlertTypeProps {
	onSelect: (type: AlertTypes, newTab?: boolean) => void;
}

export default SelectAlertType;
