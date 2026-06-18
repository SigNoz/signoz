interface IndexBadgeProps {
	index: number;
}

// Small positional badge mirroring the Pipelines list ordering chip.
function IndexBadge({ index }: IndexBadgeProps): JSX.Element {
	return <span className="am-index-badge">{index + 1}</span>;
}

export default IndexBadge;
