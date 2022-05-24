import { green, orange, volcano } from '@ant-design/colors';
import { Card } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TStatus } from 'types/api/settings/getRetention';

import { convertHoursValueToRelevantUnitString } from './utils';

function StatusMessage({
	total_retention,
	s3_retention,
	status,
}: StatusMessageProps): JSX.Element | null {
	const { t } = useTranslation();

	const messageColor = useMemo((): string => {
		if (status === 'success') return green[6];
		if (status === 'pending') return orange[6];
		if (status === 'failed') return volcano[6];
		return 'inherit';
	}, [status]);
	if (!status) {
		return null;
	}
	const s3Part =
		s3_retention && s3_retention !== -1
			? t('settings.status_message.s3_part', {
					s3_retention: convertHoursValueToRelevantUnitString(s3_retention),
			  })
			: '';
	const statusMessage =
		total_retention && total_retention !== -1
			? t(`settings.status_message.${status}`, {
					total_retention: convertHoursValueToRelevantUnitString(total_retention),
					s3_part: s3Part,
			  })
			: null;

	return statusMessage ? (
		<Card
			style={{
				width: '100%',
				color: messageColor,
			}}
		>
			{statusMessage}
		</Card>
	) : null;
}

interface StatusMessageProps {
	status: TStatus;
	total_retention: number | undefined;
	s3_retention: number | undefined;
}
export default StatusMessage;
