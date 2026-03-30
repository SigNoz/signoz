import { useState } from 'react';
import { Button } from '@signozhq/button';
import { Color } from '@signozhq/design-tokens';
import { ChevronDown, ChevronUp, CircleAlert, RotateCw } from '@signozhq/icons';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import APIError from 'types/api/error';

interface SaveErrorItemProps {
	context: string;
	apiError: APIError;
	onRetry?: () => void | Promise<void>;
}

function SaveErrorItem({
	context,
	apiError,
	onRetry,
}: SaveErrorItemProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);
	const [isRetrying, setIsRetrying] = useState(false);

	const ChevronIcon = expanded ? ChevronUp : ChevronDown;

	return (
		<div className="sa-error-item">
			<Button
				type="button"
				className="sa-error-item__header"
				disabled={isRetrying}
				onClick={(): void => {
					if (!isRetrying) {
						setExpanded((prev) => !prev);
					}
				}}
			>
				<CircleAlert size={12} className="sa-error-item__icon" />
				<span className="sa-error-item__title">
					{isRetrying ? 'Retrying...' : `${context}: ${apiError.getErrorMessage()}`}
				</span>
				{onRetry && !isRetrying && (
					<Button
						type="button"
						aria-label="Retry"
						onClick={async (e): Promise<void> => {
							e.stopPropagation();
							setIsRetrying(true);
							setExpanded(false);
							try {
								await onRetry();
							} finally {
								setIsRetrying(false);
							}
						}}
					>
						<RotateCw size={12} color={Color.BG_CHERRY_400} />
					</Button>
				)}
				{!isRetrying && (
					<ChevronIcon size={14} className="sa-error-item__chevron" />
				)}
			</Button>

			{expanded && !isRetrying && (
				<div className="sa-error-item__body">
					<ErrorContent error={apiError} />
				</div>
			)}
		</div>
	);
}

export default SaveErrorItem;
