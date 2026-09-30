import { ComponentProps, ReactNode, useState } from 'react';
import cx from 'classnames';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import SavedViewsHeader from 'container/SavedViews/SavedViewsHeader';
import SavedViewsPanel from 'container/SavedViews/SavedViewsPanel';
import { useSavedViewEnabled } from 'hooks/useSavedViewEnabled';

import QuickFilters from '../QuickFilters';
import { SIDEBAR_TOOLTIP_DELAY_MS } from './constants';

import styles from './QuickFiltersLayout.module.scss';

// Same optionality as `<QuickFilters />` in JSX (honours its defaultProps).
type QuickFiltersElementProps = JSX.LibraryManagedAttributes<
	typeof QuickFilters,
	ComponentProps<typeof QuickFilters>
>;

// What the page configures; the layout adds the open / close wiring.
type SavedViewsElementProps = Omit<
	ComponentProps<typeof SavedViewsPanel>,
	'onClose'
>;

export interface QuickFiltersLayoutProps {
	quickFilterProps?: QuickFiltersElementProps;
	savedViewProps?: SavedViewsElementProps;
	showFilters: boolean;
	className?: string;
	contentClassName?: string;
	testId?: string;
	children: ReactNode;
}

function QuickFiltersLayout({
	quickFilterProps,
	savedViewProps,
	showFilters,
	className,
	contentClassName,
	testId,
	children,
}: QuickFiltersLayoutProps): JSX.Element {
	const [isViewsListOpen, setIsViewsListOpen] = useState(false);
	const isSavedViewEnabled = useSavedViewEnabled();

	const hasQuickFilters = !!quickFilterProps;
	const hasSavedViews = !!savedViewProps && isSavedViewEnabled;

	const showSidebar = showFilters && (hasQuickFilters || hasSavedViews);

	const isViewsListPinned = hasSavedViews && !hasQuickFilters;
	const isViewsListVisible = isViewsListPinned || isViewsListOpen;

	const isSliding = hasQuickFilters && isViewsListOpen;

	const savedViewsHeader = hasSavedViews ? (
		<SavedViewsHeader
			{...savedViewProps}
			onOpenViews={
				isViewsListVisible ? undefined : (): void => setIsViewsListOpen(true)
			}
		/>
	) : undefined;

	return (
		<div className={cx(styles.layout, className)} data-testid={testId}>
			{showSidebar && (
				<aside
					className={cx(styles.sidebar, { [styles.isStatic]: !hasQuickFilters })}
					data-testid="quick-filters-layout-filters"
				>
					<TooltipProvider delayDuration={SIDEBAR_TOOLTIP_DELAY_MS}>
						<div
							className={cx(styles.quickFilters, { [styles.isOpen]: isSliding })}
							data-testid="quick-filters-layout-drawer"
						>
							{hasQuickFilters ? (
								<QuickFilters
									{...quickFilterProps}
									savedViewsHeader={savedViewsHeader}
								/>
							) : (
								savedViewsHeader
							)}
						</div>
						<div className={styles.savedViews}>
							{hasSavedViews && isViewsListVisible && (
								<SavedViewsPanel
									{...savedViewProps}
									onClose={
										isViewsListPinned ? undefined : (): void => setIsViewsListOpen(false)
									}
								/>
							)}
						</div>
					</TooltipProvider>
				</aside>
			)}
			<section
				className={cx(styles.content, contentClassName)}
				data-testid="quick-filters-layout-content"
			>
				<OverlayScrollbar>
					<div className={styles.contentInner}>{children}</div>
				</OverlayScrollbar>
			</section>
		</div>
	);
}

export default QuickFiltersLayout;
