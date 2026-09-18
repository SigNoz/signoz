import React, { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Undo } from '@signozhq/icons';
import { isModifierKeyPressed } from 'utils/app';

import { buttonText } from './config';

import './NewExplorerCTA.styles.scss';

function NewExplorerCTA(): JSX.Element | null {
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const isTracesExplorerPage = useMemo(
		() =>
			location.pathname === ROUTES.TRACE ||
			location.pathname === ROUTES.TRACES_EXPLORER,
		[location.pathname],
	);

	const onClickHandler = useCallback(
		(e?: React.MouseEvent): void => {
			let targetPath: string;
			if (location.pathname === ROUTES.TRACE) {
				targetPath = ROUTES.TRACES_EXPLORER;
			} else if (location.pathname === ROUTES.TRACES_EXPLORER) {
				targetPath = ROUTES.TRACE;
			} else {
				return;
			}
			safeNavigate(targetPath, { newTab: !!e && isModifierKeyPressed(e) });
		},
		[location.pathname],
	);

	const button = useMemo(
		() => (
			<Button
				icon={<Undo size={16} />}
				onClick={(e): void => onClickHandler(e)}
				data-testid="newExplorerCTA"
				type="text"
				className="periscope-btn link"
			>
				{buttonText[location.pathname]}
			</Button>
		),
		[location.pathname, onClickHandler],
	);

	if (!isTracesExplorerPage) {
		return null;
	}

	if (location.pathname === ROUTES.TRACES_EXPLORER) {
		return button;
	}

	return (
		<span className="new-explorer-cta-with-badge">
			{button}
			<Badge color="robin" variant="default">
				New
			</Badge>
		</span>
	);
}

export default NewExplorerCTA;
