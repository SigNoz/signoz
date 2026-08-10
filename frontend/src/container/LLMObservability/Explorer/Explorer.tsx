import styles from './Explorer.module.scss';

// Shell for the AI Observability Explorer tab. Owns the
// /ai-observability/explorer route and is intentionally empty for now: the
// query builder + results surface land in a follow-up.
function Explorer(): JSX.Element {
	return (
		<div className={styles.explorer} data-testid="llm-observability-explorer">
			<div className={styles.placeholder}>Explorer coming soon.</div>
		</div>
	);
}

export default Explorer;
