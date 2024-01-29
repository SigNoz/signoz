import './LogsError.styles.scss';

import { Typography } from 'antd';
import { ArrowRight, Frown } from 'lucide-react';

export default function LogsError(): JSX.Element {
	return (
		<div className="logs-error-container">
			<div className="logs-error-content">
				<Frown />
				<Typography.Text>
					<span className="aww-snap">Aw snap :/ </span> Something went wrong. Please
					try again or contact support.
				</Typography.Text>
				<section className="contact-support">
					<Typography.Link className="text">Contact Support </Typography.Link>
					<ArrowRight size={14} />
				</section>
			</div>
		</div>
	);
}
