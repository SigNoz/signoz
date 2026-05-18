import { Card } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Info } from '@signozhq/icons';

import './GeneralSettingsCloud.styles.scss';

export default function GeneralSettingsCloud(): JSX.Element {
	return (
		<Card className="general-settings-container">
			<Info size={16} />
			<Typography.Text>
				Please <a href="mailto:cloud-support@signoz.io"> email us </a> or connect
				with us via chat support to change the retention period.
			</Typography.Text>
		</Card>
	);
}
