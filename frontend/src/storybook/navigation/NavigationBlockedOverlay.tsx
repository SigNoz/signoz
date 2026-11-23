import { Typography } from '@signozhq/ui/typography';

import { useBlockedNavigationStore } from './blockedNavigationStore';

import styles from './NavigationBlockedOverlay.module.scss';

/**
 * Surfaces every navigation the story swallowed. Rendered by `withProviders`,
 * so any story that tries to leave the page says so instead of silently
 * doing nothing.
 */
function NavigationBlockedOverlay(): JSX.Element | null {
	const blockedNavigations = useBlockedNavigationStore(
		(state) => state.blockedNavigations,
	);
	const clear = useBlockedNavigationStore((state) => state.clear);

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
				<Typography
					variant="paragraph"
					size="small"
					weight="bold"
					color="warning"
					as="span"
					textOverflow="wrap"
				>
					Navigation blocked in Storybook
				</Typography>
				<div className={styles.actions}>
					<button
						type="button"
						className={styles.button}
						onClick={clear}
						data-testid="navigation-blocked-clear"
					>
						<Typography
							variant="paragraph"
							size="small"
							weight="medium"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							clear
						</Typography>
					</button>
				</div>
			</div>
			<ul className={styles.list}>
				{blockedNavigations.map((navigation) => (
					<li key={navigation.id} className={styles.item}>
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{navigation.via}
						</Typography>{' '}
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							→ {navigation.to}
						</Typography>
					</li>
				))}
			</ul>
		</aside>
	);
}

export default NavigationBlockedOverlay;
