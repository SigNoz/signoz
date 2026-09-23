import * as Sentry from '@sentry/react';
import { useAppContext } from 'providers/App/App';

import StripTypography from '../components/StripTypography/StripTypography';
import { useBottomStripStore } from '../store/useBottomStripStore';

function LeftSlot(): JSX.Element | null {
	const { versionData } = useAppContext();
	const left = useBottomStripStore((state) => state.left);
	const ownerId = useBottomStripStore((state) => state.ownerId);
	const version = versionData?.version?.trim();
	const versionNode = version ? (
		<StripTypography>{version}</StripTypography>
	) : null;

	if (!left) {
		return versionNode;
	}

	return (
		// Keyed so a page whose node threw does not leave the boundary latched on
		// the fallback for every page after it.
		<Sentry.ErrorBoundary key={ownerId} fallback={<>{versionNode}</>}>
			{left}
		</Sentry.ErrorBoundary>
	);
}

export default LeftSlot;
