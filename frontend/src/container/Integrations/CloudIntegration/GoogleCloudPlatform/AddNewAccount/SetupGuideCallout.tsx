import { ArrowUpRight, KeyRound } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';

import styles from './SetupGuideCallout.module.scss';

const GCP_INTEGRATION_DOCS_URL =
	'https://signoz.io/docs/integrations/gcp/gcp-integration/';

function SetupGuideCallout(): JSX.Element {
	return (
		<Callout icon={<KeyRound />} testId="gcp-setup-guide-callout">
			<Typography.Text as="span" size="base">
				Please go through our GCP integration guide, which covers all prerequisites
				— service account, IAM roles, and resource setup.
			</Typography.Text>
			<a
				className={styles.guideLink}
				href={GCP_INTEGRATION_DOCS_URL}
				target="_blank"
				rel="noopener noreferrer"
				data-testid="gcp-setup-guide-link"
			>
				GCP integration guide
				<ArrowUpRight size={12} />
			</a>
		</Callout>
	);
}

export default SetupGuideCallout;
