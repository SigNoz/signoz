import { Badge, type BadgeColorType } from '@signozhq/ui/badge';

function getStatusCodeColor(statusCode: number): BadgeColorType {
	if (statusCode >= 200 && statusCode < 300) {
		return 'success';
	}
	if (statusCode >= 300 && statusCode < 400) {
		return 'primary';
	}
	if (statusCode >= 400 && statusCode < 500) {
		return 'warning';
	}
	if (statusCode >= 500) {
		return 'danger';
	}
	if (statusCode >= 100 && statusCode < 200) {
		return 'secondary';
	}
	return 'primary';
}

interface HttpStatusBadgeProps {
	statusCode: string | number;
	testId?: string;
	className?: string;
}

function HttpStatusBadge({
	statusCode,
	testId,
	className,
}: HttpStatusBadgeProps): JSX.Element | null {
	const numericStatusCode = Number(statusCode);

	if (!numericStatusCode || numericStatusCode <= 0) {
		return null;
	}

	const color = getStatusCodeColor(numericStatusCode);

	return (
		<Badge color={color} variant="outlined" testId={testId} className={className}>
			{statusCode}
		</Badge>
	);
}

export default HttpStatusBadge;
