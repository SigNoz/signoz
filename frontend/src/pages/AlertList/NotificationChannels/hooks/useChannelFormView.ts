import ROUTES from 'constants/routes';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import { navigate } from 'lib/router/navigation';
import { openInNewTab } from 'utils/navigation';

export interface ChannelFormView {
	openCreate: (kind?: string) => void;
	openEdit: (channelId: string, options?: { newTab?: boolean }) => void;
}

/** Create and edit both render on their own route. */
export function useChannelFormView(): ChannelFormView {
	const openEdit = (channelId: string, options?: { newTab?: boolean }): void => {
		const path = buildRoutePath(ROUTES.CHANNELS_EDIT, { channelId });

		if (options?.newTab) {
			openInNewTab(path);
			return;
		}

		navigate(path);
	};

	return {
		openCreate: (kind?: string): void =>
			navigate(kind ? `${ROUTES.CHANNELS_NEW}?kind=${kind}` : ROUTES.CHANNELS_NEW),
		openEdit,
	};
}
