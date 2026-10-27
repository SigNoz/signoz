import { ComponentProps, ReactNode, useState } from 'react';
import cx from 'classnames';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import SavedViewsHeader from 'container/SavedViews/SavedViewsHeader';
import SavedViewsPanel from 'container/SavedViews/SavedViewsPanel';
import SavedViewsRestore from 'container/SavedViews/SavedViewsRestore';

import QuickFilters from '../QuickFilters';
import { SIDEBAR_TOOLTIP_DELAY_MS } from './constants';
import { useCloseOnOutsidePress } from './useCloseOnOutsidePress';

import styles from './QuickFiltersLayout.module.scss';

// Same optionality as `<QuickFilters />` in JSX (honours its defaultProps).
type QuickFiltersElementProps = Omit<
	JSX.LibraryManagedAttributes<
		typeof QuickFilters,
		ComponentProps<typeof QuickFilters>
	>,
	'handleFilterVisibilityChange'
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
	onToggleFilters?: () => void;
	className?: string;
	contentClassName?: string;
	testId?: string;
	children: ReactNode;
}

function QuickFiltersLayout({
	quickFilterProps,
	savedViewProps,
	showFilters,
	onToggleFilters,
	className,
	contentClassName,
	testId,
	children,
}: QuickFiltersLayoutProps): JSX.Element {
	const [isViewsListOpen, setIsViewsListOpen] = useState(false);

	const hasQuickFilters = !!quickFilterProps;
	const hasSavedViews = !!savedViewProps;

	const showSidebar = showFilters && (hasQuickFilters || hasSavedViews);

	const isViewsListPinned = hasSavedViews && !hasQuickFilters;
	const isViewsListVisible = isViewsListPinned || isViewsListOpen;

	const isSliding = hasQuickFilters && isViewsListOpen;

	const openViews = (): void => setIsViewsListOpen(true);
	const toggleViews = (): void => setIsViewsListOpen((isOpen) => !isOpen);
	const closeViews = (): void => setIsViewsListOpen(false);
	const markSidebarPress = useCloseOnOutsidePress(
		showSidebar && isSliding,
		closeViews,
	);

	const savedViewsHeader = hasSavedViews ? (
		<SavedViewsHeader
			{...savedViewProps}
			onOpenViews={isViewsListVisible ? undefined : openViews}
			isViewsOpen={isViewsListOpen}
			onToggleViews={isViewsListPinned ? undefined : toggleViews}
			onCollapse={hasQuickFilters ? undefined : onToggleFilters}
		/>
	) : undefined;

	return (
		<div className={cx(styles.layout, className)} data-testid={testId}>
			{hasSavedViews && <SavedViewsRestore source={savedViewProps.source} />}
			{showSidebar && (
				<aside
					className={cx(styles.sidebar, { [styles.isStatic]: !hasQuickFilters })}
					onPointerDownCapture={markSidebarPress}
					data-testid="quick-filters-layout-filters"
				>
					<TooltipProvider delay={SIDEBAR_TOOLTIP_DELAY_MS}>
						<div
							className={cx(styles.quickFilters, { [styles.isOpen]: isSliding })}
							data-testid="quick-filters-layout-drawer"
						>
							{hasQuickFilters ? (
								<QuickFilters
									{...quickFilterProps}
									handleFilterVisibilityChange={onToggleFilters}
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
									onClose={isViewsListPinned ? undefined : closeViews}
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
