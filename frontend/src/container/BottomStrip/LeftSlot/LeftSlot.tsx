import * as Sentry from '@sentry/react';
import { useAppContext } from 'providers/App/App';

import StripKeyValue from '../components/StripKeyValue/StripKeyValue';
import StripTypography from '../components/StripTypography/StripTypography';
import { useBottomStripStore } from '../store/useBottomStripStore';
import { type StripItem, StripItemKind } from '../types';

function renderItem(item: StripItem, index: number): JSX.Element {
	if (item.kind === StripItemKind.KeyValue) {
		return (
			<StripKeyValue
				key={index}
				label={item.label}
				value={item.value}
				prefix={item.prefix}
				tone={item.tone}
			/>
		);
	}

	return (
		// eslint-disable-next-line react/no-array-index-key
		<StripTypography key={index} prefix={item.prefix}>
			{item.text}
		</StripTypography>
	);
}

function LeftSlot(): JSX.Element | null {
	const { versionData } = useAppContext();
	const left = useBottomStripStore((state) => state.left);
	const ownerId = useBottomStripStore((state) => state.ownerId);

	const version = versionData?.version?.trim();
	const versionNode = version ? (
		<StripTypography>{version}</StripTypography>
	) : null;

	if (!left?.length) {
		return versionNode;
	}

	return (
		// Keyed so a page whose items throw does not leave the boundary latched on
		// the fallback for every page after it.
		<Sentry.ErrorBoundary key={ownerId} fallback={<>{versionNode}</>}>
			{left.map(renderItem)}
		</Sentry.ErrorBoundary>
	);
}

export default LeftSlot;
