import { PrettyView } from 'periscope/components/PrettyView';

import styles from './AIThreadMessage.module.scss';

interface JsonBlockProps {
	data: object;
}

// Expanding tree nodes must not count as a click on the message.
function JsonBlock({ data }: JsonBlockProps): JSX.Element {
	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			className={styles.json}
			onClick={(event): void => event.stopPropagation()}
		>
			<PrettyView
				data={data as Record<string, unknown>}
				searchable={false}
				drawerKey="ai-thread-message"
			/>
		</div>
	);
}

export default JsonBlock;
