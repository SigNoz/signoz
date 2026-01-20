import { Badge } from '@signozhq/badge';

type BadgeColor =
	| 'vanilla'
	| 'robin'
	| 'forest'
	| 'amber'
	| 'sienna'
	| 'cherry'
	| 'sakura'
	| 'aqua';

interface HttpStatusBadgeProps {
	statusCode: string | number;
}

function getStatusCodeColor(statusCode: number): BadgeColor {
	if (statusCode >= 200 && statusCode < 300) {
		return 'forest'; // Success - green
	}
	if (statusCode >= 300 && statusCode < 400) {
		return 'robin'; // Redirect - blue
	}
	if (statusCode >= 400 && statusCode < 500) {
		return 'amber'; // Client error - amber
	}
	if (statusCode >= 500) {
		return 'cherry'; // Server error - red
	}
	if (statusCode >= 100 && statusCode < 200) {
		return 'vanilla'; // Informational - neutral
	}
	return 'robin'; // Default fallback
}

function HttpStatusBadge({
	statusCode,
}: HttpStatusBadgeProps): JSX.Element | null {
	const numericStatusCode = Number(statusCode);

	if (!numericStatusCode || numericStatusCode <= 0) {
		return null;
	}

	const color = getStatusCodeColor(numericStatusCode);

	return <Badge color={color}>{statusCode}</Badge>;
}

export default HttpStatusBadge;
