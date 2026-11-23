import { useState } from 'react';
import { ArrowUpRight, SolidInfoCircle } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';

import styles from './MissingSpansBanner.module.scss';

const MISSING_SPANS_DOCS_URL =
	'https://signoz.io/docs/traces-management/troubleshooting/faqs/#q-why-are-some-spans-missing-from-a-trace';

function MissingSpansBanner(): JSX.Element | null {
	// Session-only dismissal — not persisted, so the banner returns on reload.
	const [isDismissed, setIsDismissed] = useState(false);

	if (isDismissed) {
		return null;
	}

	// Wrapper owns the gutter: Callout is width:100%, so putting the gutter as a
	// margin on it would overflow the parent by the margin width. Pad instead.
	return (
		<div className={styles.container}>
			<Callout.Closeable
				color="primary"
				size="sm"
				icon={<SolidInfoCircle />}
				closed={false}
				onClose={(): void => setIsDismissed(true)}
				testId="missing-spans-banner"
			>
				<span className={styles.title}>
					This trace has missing spans
					<Callout.Link href={MISSING_SPANS_DOCS_URL} target="_blank">
						Learn More <ArrowUpRight size={14} />
					</Callout.Link>
				</span>
			</Callout.Closeable>
		</div>
	);
}

export default MissingSpansBanner;
