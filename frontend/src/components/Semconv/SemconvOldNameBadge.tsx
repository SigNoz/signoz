import { Badge } from '@signozhq/ui/badge';
import { getSemconvRename } from 'utils/semconv';

interface SemconvOldNameBadgeProps {
	name: string;
}

function SemconvOldNameBadge({
	name,
}: SemconvOldNameBadgeProps): JSX.Element | null {
	const rename = getSemconvRename(name);
	if (!rename || rename.family.kind !== 'attribute') {
		return null;
	}

	return (
		<Badge color="amber" variant="outline" data-testid="semconv-old-name-badge">
			old name, renamed to {rename.current}
		</Badge>
	);
}

export default SemconvOldNameBadge;
