import { ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from 'antd';

import styles from './SectionActionButton.module.scss';

interface SectionActionButtonProps {
	icon: ReactNode;
	tooltip: string;
	onClick: () => void;
	testId: string;
}

export function SectionActionButton({
	icon,
	tooltip,
	onClick,
	testId,
}: SectionActionButtonProps): JSX.Element {
	return (
		<Tooltip title={tooltip}>
			<Button
				variant="link"
				color="secondary"
				size="sm"
				className={styles.iconBtn}
				onMouseDown={(e): void => e.preventDefault()}
				onClick={(e): void => {
					e.stopPropagation();
					e.preventDefault();
					onClick();
				}}
				data-testid={testId}
			>
				{icon}
			</Button>
		</Tooltip>
	);
}
