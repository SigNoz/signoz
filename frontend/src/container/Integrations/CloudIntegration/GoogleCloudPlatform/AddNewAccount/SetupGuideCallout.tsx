import { ArrowUpRight, KeyRound } from '@signozhq/icons';

import styles from './CloudAccountSetupDrawer.module.scss';

interface SetupGuideCalloutProps {
	onOpenGuide: () => void;
}

function SetupGuideCallout({
	onOpenGuide,
}: SetupGuideCalloutProps): JSX.Element {
	return (
		<div className={styles.guideCallout}>
			<KeyRound size={16} className={styles.guideIcon} />
			<div className={styles.guideBody}>
				<span className={styles.guideText}>
					Please go through our GCP integration guide, which covers all prerequisites
					— service account, IAM roles, and resource setup.
				</span>
				<button
					type="button"
					className={styles.guideLink}
					onClick={onOpenGuide}
					data-testid="gcp-setup-guide-link"
				>
					GCP integration guide
					<ArrowUpRight size={14} />
				</button>
			</div>
		</div>
	);
}

export default SetupGuideCallout;
