import { Skeleton } from '@signozhq/ui/skeleton';

import styles from './NavItemsSkeleton.module.scss';

interface NavItemsSkeletonProps {
	count: number;
}

function NavItemsSkeleton({ count }: NavItemsSkeletonProps): JSX.Element {
	return (
		<div className="nav-items-section" data-testid="sidenav-items-skeleton">
			{Array.from({ length: count }, (_, row) => (
				<div className={styles.row} key={`skeleton-row-${row}`}>
					<Skeleton.Button active size="md" width="100%" />
				</div>
			))}
		</div>
	);
}

export default NavItemsSkeleton;
