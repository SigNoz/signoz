import './AlertSeverity.styles.scss';

import SeverityCriticalIcon from 'assets/AlertHistory/SeverityCriticalIcon';
import SeverityErrorIcon from 'assets/AlertHistory/SeverityErrorIcon';
import SeverityInfoIcon from 'assets/AlertHistory/SeverityInfoIcon';
import SeverityWarningIcon from 'assets/AlertHistory/SeverityWarningIcon';

export default function AlertSeverity({
	severity,
}: {
	severity: string;
}): JSX.Element {
	const severityConfig: Record<string, Record<string, string | JSX.Element>> = {
		critical: {
			text: 'Critical',
			className: 'alert-severity--critical',
			icon: <SeverityCriticalIcon />,
		},
		error: {
			text: 'Error',
			className: 'alert-severity--error',
			icon: <SeverityErrorIcon />,
		},
		warning: {
			text: 'Warning',
			className: 'alert-severity--warning',
			icon: <SeverityWarningIcon />,
		},
		info: {
			text: 'Info',
			className: 'alert-severity--info',
			icon: <SeverityInfoIcon />,
		},
	};
	const severityDetails = severityConfig[severity];
	return (
		<div className={`alert-severity ${severityDetails.className}`}>
			<div className="alert-severity__icon">{severityDetails.icon}</div>
			<div className="alert-severity__text">{severityDetails.text}</div>
		</div>
	);
}
