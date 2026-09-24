import { ComponentProps, ReactNode } from 'react';
import cx from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';

import QuickFilters from '../QuickFilters';

import styles from './QuickFiltersLayout.module.scss';

// Same optionality as `<QuickFilters />` in JSX (honours its defaultProps).
type QuickFiltersElementProps = JSX.LibraryManagedAttributes<
	typeof QuickFilters,
	ComponentProps<typeof QuickFilters>
>;

export interface QuickFiltersLayoutProps {
	quickFilterProps: QuickFiltersElementProps;
	showFilters: boolean;
	className?: string;
	contentClassName?: string;
	testId?: string;
	children: ReactNode;
}

function QuickFiltersLayout({
	quickFilterProps,
	showFilters,
	className,
	contentClassName,
	testId,
	children,
}: QuickFiltersLayoutProps): JSX.Element {
	return (
		<div className={cx(styles.layout, className)} data-testid={testId}>
			{showFilters && (
				<aside
					className={styles.filters}
					data-testid="quick-filters-layout-filters"
				>
					<QuickFilters {...quickFilterProps} />
				</aside>
			)}
			<section
				className={cx(styles.content, contentClassName)}
				data-testid="quick-filters-layout-content"
			>
				<OverlayScrollbar>
					<div>{children}</div>
				</OverlayScrollbar>
			</section>
		</div>
	);
}

export default QuickFiltersLayout;
