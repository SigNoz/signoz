import JsonBlock from '../AIThreadMessage/JsonBlock';
import { RawMessagesValue } from '../utils/spanMessages';

import styles from './SpanMessages.module.scss';

interface RawMessagesProps {
	value: RawMessagesValue;
}

function RawMessages({ value }: RawMessagesProps): JSX.Element {
	if (typeof value === 'object') {
		return <JsonBlock data={value} />;
	}
	return (
		<span className={styles.rawUnavailable} data-testid="span-raw-messages">
			Unable to render messages
		</span>
	);
}

export default RawMessages;
