import { ReactNode } from 'react';
import { ArrowLeft } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isModifierKeyPressed } from 'utils/app';

import styles from './BackHeader.module.scss';

export interface BackHeaderProps {
	/** Where the page came from, named as the place rather than the action. */
	backLabel: string;
	backRoute: string;
	title: ReactNode;
	testId?: string;
}

/**
 * A way back on its own line, then the page's own title. The two rows keep the
 * title clear of whatever sits beside it, such as a copy button.
 */
function BackHeader({
	backLabel,
	backRoute,
	title,
	testId,
}: BackHeaderProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();

	return (
		<>
			<div className={styles.header} data-testid={testId}>
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					prefix={<ArrowLeft size={12} />}
					onClick={(e: React.MouseEvent): void => {
						safeNavigate(backRoute, { newTab: isModifierKeyPressed(e) });
					}}
					testId="back-link"
				>
					{backLabel}
				</Button>
				<div className={styles.title}>{title}</div>
			</div>
			<Divider className={styles.divider} />
		</>
	);
}

BackHeader.defaultProps = {
	testId: undefined,
};

export default BackHeader;
