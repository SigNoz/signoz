import JsonBlock from '../AIThreadMessage/JsonBlock';
import { RawMessagesValue } from './utils';

import styles from './SpanMessages.module.scss';

interface RawMessagesProps {
	value: RawMessagesValue;
}

function RawMessages({ value }: RawMessagesProps): JSX.Element {
	if (typeof value === 'object') {
		return <JsonBlock data={value} />;
	}
	return (
		<pre className={styles.raw} data-testid="span-raw-messages">
			{value}
		</pre>
	);
}

export default RawMessages;
