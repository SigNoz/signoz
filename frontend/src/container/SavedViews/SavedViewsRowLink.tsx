import { MouseEvent, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Typography } from '@signozhq/ui/typography';
import { isModifierKeyPressed } from 'utils/app';
import { useTimeSearchParams } from 'hooks/useTimeSearchParams';

import { SavedViewsRowLinkProps } from './types';
import { getSavedViewPath } from './utils/getSavedViewPath';

import styles from './SavedViewsList.module.scss';

function SavedViewsRowLink({
	view,
	isActive,
	onSelect,
}: SavedViewsRowLinkProps): JSX.Element {
	const { pathname } = useLocation();
	const timeSearch = useTimeSearchParams();
	const path = useMemo(
		() => getSavedViewPath(pathname, view, timeSearch),
		[pathname, view, timeSearch],
	);

	// Opening in a new tab or window is left to the browser.
	const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
		if (isModifierKeyPressed(event) || event.shiftKey) {
			return;
		}
		event.preventDefault();
		if (!isActive) {
			onSelect(view);
		}
	};

	return (
		<Link
			to={path}
			className={styles.rowLink}
			aria-current={isActive ? 'page' : undefined}
			onClick={handleClick}
			data-testid="saved-views-row-name"
		>
			<Typography.Text
				as="span"
				size="base"
				weight="normal"
				truncate={1}
				className={styles.rowLinkLabel}
			>
				{view.spec.displayName}
			</Typography.Text>
		</Link>
	);
}

export default SavedViewsRowLink;
