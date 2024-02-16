/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './LogsError.styles.scss';

import { Typography } from 'antd';
import history from 'lib/history';
import { ArrowRight } from 'lucide-react';
import { isCloudUser } from 'utils/app';

export default function LogsError(): JSX.Element {
	const handleContactSupport = (): void => {
		if (isCloudUser()) {
			history.push('/support');
		} else {
			window.open('https://signoz.io/slack', '_blank');
		}
	};
	return (
		<div className="logs-error-container">
			<div className="logs-error-content">
				<img
					src="/Icons/awwSnap.svg"
					alt="error-emoji"
					className="error-state-svg"
				/>
				<Typography.Text>
					<span className="aww-snap">Aw snap :/ </span> Something went wrong. Please
					try again or contact support.
				</Typography.Text>

				<div className="contact-support" onClick={handleContactSupport}>
					<Typography.Link className="text">Contact Support </Typography.Link>

					<ArrowRight size={14} />
				</div>
			</div>
		</div>
	);
}
