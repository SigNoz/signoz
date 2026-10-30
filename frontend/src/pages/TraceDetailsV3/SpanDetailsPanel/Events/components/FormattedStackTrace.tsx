import cx from 'classnames';

import styles from './FormattedStackTrace.module.scss';

const FRAME_REGEX = /^\s+(at\s|File\s")/;
const CAUSE_REGEX = /^(Caused by|Suppressed):/;

function getLineClass(line: string): string {
	if (FRAME_REGEX.test(line)) {
		return styles.frame;
	}
	if (CAUSE_REGEX.test(line)) {
		return styles.cause;
	}
	return styles.header;
}

interface FormattedStackTraceProps {
	stackTrace: string;
}

function FormattedStackTrace({
	stackTrace,
}: FormattedStackTraceProps): JSX.Element {
	return (
		<pre className={styles.stackTrace}>
			{stackTrace.split('\n').map((line, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<div key={index} className={cx(styles.line, getLineClass(line))}>
					{line || ' '}
				</div>
			))}
		</pre>
	);
}

export default FormattedStackTrace;
