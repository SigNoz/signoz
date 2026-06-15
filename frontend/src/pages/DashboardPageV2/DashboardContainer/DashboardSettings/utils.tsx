import { Empty } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import styles from './DashboardSettings.module.scss';

/**
 * TEMPORARY: stand-in for the not-yet-built Variables / Publish settings tabs.
 * Will be cleaned up later once those tabs ship their real content.
 */
export function SettingsTabPlaceholder({
	message,
}: {
	message: string;
}): JSX.Element {
	return (
		<div className={styles.placeholder}>
			<Empty
				image={Empty.PRESENTED_IMAGE_SIMPLE}
				description={<Typography.Text>{message}</Typography.Text>}
			/>
		</div>
	);
}
