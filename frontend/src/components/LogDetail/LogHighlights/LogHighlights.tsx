import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { ILog } from 'types/api/logs/log';

import { LOG_HIGHLIGHTS } from './config';
import styles from './LogHighlights.module.scss';

interface LogHighlightsProps {
	log: ILog;
}

function LogHighlights({ log }: LogHighlightsProps): JSX.Element | null {
	const fields = LOG_HIGHLIGHTS.map((field) => ({
		key: field.key,
		label: field.label,
		value: field.render(log),
	})).filter((field) => field.value != null);

	if (fields.length === 0) {
		return null;
	}

	return (
		<div className={styles.highlights} data-testid="log-details-highlights">
			{fields.map((field) => (
				<KeyValueLabel
					key={field.key}
					badgeKey={field.label}
					badgeValue={field.value}
					direction="column"
				/>
			))}
		</div>
	);
}

export default LogHighlights;
