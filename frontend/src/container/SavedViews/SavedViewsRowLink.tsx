import { MouseEvent, useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { AppLink } from 'lib/router/AppLink';
import { useAppLocation } from 'lib/router/useAppLocation';
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
	const { pathname } = useAppLocation();
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
		<AppLink
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
		</AppLink>
	);
}

export default SavedViewsRowLink;
