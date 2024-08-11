import './alertSeverity.styles.scss';

import SeverityCritical from 'assets/AlertHistory/SeverityCritical';
import SeverityError from 'assets/AlertHistory/SeverityError';
import SeverityInfo from 'assets/AlertHistory/SeverityInfo';
import SeverityWarning from 'assets/AlertHistory/SeverityWarning';

export default function AlertSeverity({
	severity,
}: {
	severity: string;
}): JSX.Element {
	const severityConfig: Record<string, Record<string, string | JSX.Element>> = {
		critical: {
			text: 'Critical',
			className: 'alert-severity--critical',
			icon: <SeverityCritical />,
		},
		error: {
			text: 'Error',
			className: 'alert-severity--error',
			icon: <SeverityError />,
		},
		warning: {
			text: 'Warning',
			className: 'alert-severity--warning',
			icon: <SeverityWarning />,
		},
		info: {
			text: 'Info',
			className: 'alert-severity--info',
			icon: <SeverityInfo />,
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
