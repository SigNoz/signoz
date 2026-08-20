import { Typography } from '@signozhq/ui/typography';

import { clearBlockedNavigations } from './blockedNavigationStore';
import { useBlockedNavigations } from './useBlockedNavigations';

import styles from './NavigationBlockedOverlay.module.scss';

/**
 * Surfaces every navigation the story swallowed. Rendered by `withProviders`,
 * so any story that tries to leave the page says so instead of silently
 * doing nothing.
 */
function NavigationBlockedOverlay(): JSX.Element | null {
	const blockedNavigations = useBlockedNavigations();

	if (blockedNavigations.length === 0) {
		return null;
	}

	return (
		<aside
			className={styles.overlay}
			aria-live="polite"
			data-testid="navigation-blocked-overlay"
		>
			<div className={styles.header}>
				<Typography.Text as="span" size="small" weight="semibold" color="warning">
					Navigation blocked in Storybook
				</Typography.Text>
				<div className={styles.actions}>
					<button
						type="button"
						className={styles.button}
						onClick={clearBlockedNavigations}
						data-testid="navigation-blocked-clear"
					>
						<Typography.Text as="span" size="small" weight="medium">
							clear
						</Typography.Text>
					</button>
				</div>
			</div>
			<ul className={styles.list}>
				{blockedNavigations.map((navigation) => (
					<li key={navigation.id} className={styles.item}>
						<Typography.Text as="span" size="small" color="muted">
							{navigation.via}
						</Typography.Text>{' '}
						<Typography.Text as="span" size="small">
							→ {navigation.to}
						</Typography.Text>
					</li>
				))}
			</ul>
		</aside>
	);
}

export default NavigationBlockedOverlay;
