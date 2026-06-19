import styles from './LLMObservabilityAttributeMapping.module.scss';

interface IndexBadgeProps {
	index: number;
}

// Small positional badge mirroring the Pipelines list ordering chip.
function IndexBadge({ index }: IndexBadgeProps): JSX.Element {
	return <span className={styles.indexBadge}>{index + 1}</span>;
}

export default IndexBadge;
