import { ArrowUpRight, KeyRound } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';

import styles from './SetupGuideCallout.module.scss';

interface SetupGuideCalloutProps {
	description: string;
	docsUrl: string;
	linkLabel: string;
}

function SetupGuideCallout({
	description,
	docsUrl,
	linkLabel,
}: SetupGuideCalloutProps): JSX.Element {
	return (
		<Callout
			color="primary"
			size="sm"
			icon={<KeyRound />}
			testId="gcp-setup-guide-callout"
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{description}
			</Typography>
			<a
				className={styles.guideLink}
				href={docsUrl}
				target="_blank"
				rel="noopener noreferrer"
				data-testid="gcp-setup-guide-link"
			>
				{linkLabel}
				<ArrowUpRight size={12} />
			</a>
		</Callout>
	);
}

export default SetupGuideCallout;
