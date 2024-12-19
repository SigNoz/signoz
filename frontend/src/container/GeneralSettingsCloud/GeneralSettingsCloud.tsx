import './GeneralSettingsCloud.styles.scss';

import { Card, Typography } from 'antd';
import { Info } from 'lucide-react';

export default function GeneralSettingsCloud(): JSX.Element {
	return (
		<Card className="general-settings-container">
			<Info size={16} />
			<Typography.Text>
				Please <a href="mailto:cloud-support@signoz.io"> email us </a> or connect
				with us via intercom support to change the retention period.
			</Typography.Text>
		</Card>
	);
}
