import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import createJsmOpsSession from 'api/channels/createJsmOpsSession';
import { ENVIRONMENT } from 'constants/env';
import { useNotifications } from 'hooks/useNotifications';
import APIError from 'types/api/error';

export interface ConnectedConnection {
	id: string;
	site?: string;
}

function getOAuthOrigin(): string {
	if (ENVIRONMENT.baseURL) {
		return new URL(ENVIRONMENT.baseURL).origin;
	}
	// oxlint-disable-next-line signoz/no-raw-absolute-path
	return window.location.origin;
}

interface UseJsmOpsConnectResult {
	connect: () => Promise<void>;
	isConnecting: boolean;
}

export function useJsmOpsConnect(
	onConnected: (connection: ConnectedConnection) => void,
): UseJsmOpsConnectResult {
	const { t } = useTranslation('channels');
	const { notifications } = useNotifications();
	const [isConnecting, setIsConnecting] = useState(false);
	const onConnectedRef = useRef(onConnected);
	onConnectedRef.current = onConnected;

	useEffect(() => {
		const handleMessage = (event: MessageEvent): void => {
			if (event.origin !== getOAuthOrigin() || !event.data) {
				return;
			}

			if (event.data.type === 'jsmops_oauth_success' && event.data.connection_id) {
				setIsConnecting(false);
				onConnectedRef.current({
					id: event.data.connection_id,
					site: event.data.site,
				});
			} else if (event.data.type === 'jsmops_oauth_error') {
				setIsConnecting(false);
				notifications.error({
					message: 'Error',
					description:
						event.data.error === 'oauth_not_configured'
							? t('jsmops_oauth_not_configured')
							: t('jsmops_oauth_failed'),
				});
			}
		};

		window.addEventListener('message', handleMessage);
		return (): void => window.removeEventListener('message', handleMessage);
	}, [notifications, t]);

	const connect = useCallback(async (): Promise<void> => {
		setIsConnecting(true);
		try {
			// oxlint-disable-next-line signoz/no-raw-absolute-path -- opener origin is a bare origin used only as a postMessage target
			const openerOrigin = window.location.origin;
			const session = await createJsmOpsSession({ openerOrigin });

			const width = 600;
			const height = 700;
			const left = window.screen.width / 2 - width / 2;
			const top = window.screen.height / 2 - height / 2;

			// oxlint-disable-next-line signoz/no-raw-absolute-path -- OAuth popup needs explicit dimensions; openInNewTab does not support window features
			const popup = window.open(
				session.data.authorize_url,
				'atlassian_oauth',
				`width=${width},height=${height},left=${left},top=${top}`,
			);

			if (popup) {
				const pollTimer = setInterval(() => {
					if (popup.closed) {
						clearInterval(pollTimer);
						setIsConnecting(false);
					}
				}, 500);
			}
		} catch (error) {
			setIsConnecting(false);
			notifications.error({
				message: (error as APIError).getErrorCode?.() || 'Error',
				description:
					(error as APIError).getErrorMessage?.() || t('jsmops_oauth_failed'),
			});
		}
	}, [notifications, t]);

	return { connect, isConnecting };
}
