import { Spinner } from '@signozhq/ui/spinner';

import styles from './SpanDrawerTraceSection.module.scss';

/** Holds a trace view's place from the span count until the view has its data. */
function TraceViewLoader(): JSX.Element {
	return (
		<output
			className={styles.viewLoader}
			aria-label="Loading trace"
			data-testid="span-drawer-trace-loading"
		>
			<Spinner size={20} />
		</output>
	);
}

export default TraceViewLoader;
