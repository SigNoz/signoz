import { Badge } from '@signozhq/ui/badge';

interface SemconvOldNameBadgeProps {
	old: string;
	current: string;
}

function SemconvOldNameBadge({
	old,
	current,
}: SemconvOldNameBadgeProps): JSX.Element {
	return (
		<Badge
			color="warning"
			variant="outlined"
			textTransform="none"
			testId={`semconv-old-name-badge-${old}`}
		>
			{`old name, renamed to ${current}`}
		</Badge>
	);
}

export default SemconvOldNameBadge;
