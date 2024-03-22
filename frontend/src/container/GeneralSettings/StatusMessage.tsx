import { green, orange, volcano } from '@ant-design/colors';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Card, Col } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TStatus } from 'types/api/settings/getRetention';

import { convertHoursValueToRelevantUnitString } from './utils';

function StatusMessage({
	total_retention,
	s3_retention,
	status,
}: StatusMessageProps): JSX.Element | null {
	const { t } = useTranslation(['generalSettings']);

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
			? t('status_message.s3_part', {
					s3_retention: convertHoursValueToRelevantUnitString(s3_retention),
			  })
			: '';
	const statusMessage =
		total_retention && total_retention !== -1
			? t(`status_message.${status}`, {
					total_retention: convertHoursValueToRelevantUnitString(total_retention),
					s3_part: s3Part,
			  })
			: null;

	return statusMessage ? (
		<Card
			style={{
				width: '100%',
			}}
		>
			<div
				style={{
					display: 'flex',
					gap: '1rem',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Col xs={1}>
					<InfoCircleOutlined style={{ fontSize: '1rem' }} />
				</Col>

				<Col
					xs={22}
					style={{
						color: messageColor,
					}}
				>
					{statusMessage}
				</Col>
			</div>
		</Card>
	) : null;
}

interface StatusMessageProps {
	status: TStatus;
	total_retention: number | undefined;
	s3_retention: number | undefined;
}
export default StatusMessage;
