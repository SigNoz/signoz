import type { ReactNode } from 'react';
import { Switch } from '@signozhq/ui/switch';

import ChangedDot from '../ChangedDot/ChangedDot';

import styles from './ConfigSwitch.module.scss';

interface ConfigSwitchProps {
	testId: string;
	title: string;
	description?: string;
	sketch?: ReactNode;
	changed?: boolean;
	value: boolean;
	onChange: (checked: boolean) => void;
}

function ConfigSwitch({
	testId,
	title,
	description,
	sketch,
	changed,
	value,
	onChange,
}: ConfigSwitchProps): JSX.Element {
	return (
		<div className={styles.card}>
			{sketch}
			<div className={styles.text}>
				<span className={styles.title}>
					{title}
					{changed && <ChangedDot />}
				</span>
				{description && <span className={styles.description}>{description}</span>}
			</div>
			<Switch testId={testId} value={value} onChange={onChange} />
		</div>
	);
}

export default ConfigSwitch;
