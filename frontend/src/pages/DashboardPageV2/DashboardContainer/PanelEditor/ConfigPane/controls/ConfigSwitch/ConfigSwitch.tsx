import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';

import styles from './ConfigSwitch.module.scss';

interface ConfigSwitchProps {
	testId: string;
	/** Shown uppercased as the card title. */
	title: string;
	/** Optional helper line under the title. */
	description?: string;
	value: boolean;
	onChange: (checked: boolean) => void;
}

/**
 * Boolean toggle rendered as a bordered card: an uppercase title with an optional
 * description on the left and a Switch on the right. The standard presentation for
 * on/off panel-config controls (e.g. "Show points").
 */
function ConfigSwitch({
	testId,
	title,
	description,
	value,
	onChange,
}: ConfigSwitchProps): JSX.Element {
	return (
		<div className={styles.card}>
			<div className={styles.text}>
				<span className={styles.title}>{title}</span>
				{description && (
					<Typography.Text className={styles.description}>
						{description}
					</Typography.Text>
				)}
			</div>
			<Switch testId={testId} value={value} onChange={onChange} />
		</div>
	);
}

export default ConfigSwitch;
