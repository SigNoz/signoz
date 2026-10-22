import { ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from 'antd';

interface SectionActionButtonProps {
	icon: ReactNode;
	tooltip: string;
	onClick: () => void;
	testId: string;
	className?: string;
}

export function SectionActionButton({
	icon,
	tooltip,
	onClick,
	testId,
	className,
}: SectionActionButtonProps): JSX.Element {
	return (
		<Tooltip title={tooltip}>
			<span className={className} onMouseDown={(e): void => e.preventDefault()}>
				<Button
					variant="link"
					color="secondary"
					size="sm"
					onClick={(e): void => {
						e.stopPropagation();
						e.preventDefault();
						onClick();
					}}
					testId={testId}
				>
					{icon}
				</Button>
			</span>
		</Tooltip>
	);
}
