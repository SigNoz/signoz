import { useState } from 'react';
import cx from 'classnames';

import styles from './EdgeSweep.module.scss';

interface EdgeSweepProps {
	/** When the current stream began; null while idle. */
	startedAt: number | null;
}

interface SweepRun {
	startedAt: number;
	elapsedMs: number;
}

/** Gradient sweeping the input's top edge while Noz replies. */
export default function EdgeSweep({ startedAt }: EdgeSweepProps): JSX.Element {
	// Outlives the stream so the line keeps moving while it fades out.
	const [run, setRun] = useState<SweepRun | null>(() =>
		startedAt === null ? null : { startedAt, elapsedMs: Date.now() - startedAt },
	);
	// A new stream restarts from the left; a remount mid-stream picks up where it was.
	if (startedAt !== null && startedAt !== run?.startedAt) {
		setRun({ startedAt, elapsedMs: Date.now() - startedAt });
	}

	return (
		<div
			className={cx(styles.edgeSweep, { [styles.isVisible]: startedAt !== null })}
			onTransitionEnd={(): void => {
				if (startedAt === null) {
					setRun(null);
				}
			}}
			aria-hidden
		>
			{run && (
				<div
					key={run.startedAt}
					className={styles.line}
					style={{ animationDelay: `${-run.elapsedMs}ms` }}
				/>
			)}
		</div>
	);
}
