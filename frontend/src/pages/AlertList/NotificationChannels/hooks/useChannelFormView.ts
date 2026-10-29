import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { openInNewTab } from 'utils/navigation';

export interface ChannelFormView {
	openCreate: (kind?: string) => void;
	openEdit: (channelId: string, options?: { newTab?: boolean }) => void;
}

/** Create and edit both render on their own route. */
export function useChannelFormView(): ChannelFormView {
	const openEdit = (channelId: string, options?: { newTab?: boolean }): void => {
		const path = generatePath(ROUTES.CHANNELS_EDIT, { channelId });

		if (options?.newTab) {
			openInNewTab(path);
			return;
		}

		history.push(path);
	};

	return {
		openCreate: (kind?: string): void =>
			history.push(
				kind ? `${ROUTES.CHANNELS_NEW}?kind=${kind}` : ROUTES.CHANNELS_NEW,
			),
		openEdit,
	};
}
