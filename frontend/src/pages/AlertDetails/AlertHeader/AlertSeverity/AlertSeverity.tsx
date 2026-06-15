import { useMemo } from 'react';
import * as Sentry from '@sentry/react';
import SeverityCriticalIcon from 'assets/AlertHistory/SeverityCriticalIcon';
import SeverityErrorIcon from 'assets/AlertHistory/SeverityErrorIcon';
import SeverityInfoIcon from 'assets/AlertHistory/SeverityInfoIcon';
import SeverityWarningIcon from 'assets/AlertHistory/SeverityWarningIcon';

import styles from './AlertSeverity.module.scss';

const severityConfig: Record<string, Record<string, string | JSX.Element>> = {
	critical: {
		text: 'Critical',
		className: styles.critical,
		icon: <SeverityCriticalIcon />,
	},
	error: {
		text: 'Error',
		className: styles.error,
		icon: <SeverityErrorIcon />,
	},
	warning: {
		text: 'Warning',
		className: styles.warning,
		icon: <SeverityWarningIcon />,
	},
	info: {
		text: 'Info',
		className: styles.info,
		icon: <SeverityInfoIcon />,
	},
};

export default function AlertSeverity({
	severity,
}: {
	severity: string;
}): JSX.Element {
	const severityDetails = useMemo(() => {
		if (severityConfig[severity]) {
			return severityConfig[severity];
		}

		Sentry.captureEvent({
			message: `Received unknown severity on Alert Details: ${severity}`,
			level: 'error',
		});

		return {
			text: severity,
			className: styles.info,
			icon: <SeverityInfoIcon />,
		};
	}, [severity]);
	return (
		<div className={`${styles.alertSeverity} ${severityDetails.className}`}>
			<div className={styles.icon}>{severityDetails.icon}</div>
			<div className={styles.text}>{severityDetails.text}</div>
		</div>
	);
}
