import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import createJiraOAuthSession from 'api/channels/createJiraOAuthSession';
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

interface UseJiraConnectResult {
	connect: () => Promise<void>;
	isConnecting: boolean;
}

export function useJiraConnect(
	onConnected: (connection: ConnectedConnection) => void,
): UseJiraConnectResult {
	const { t } = useTranslation('channels');
	const { notifications } = useNotifications();
	const [isConnecting, setIsConnecting] = useState(false);
	const onConnectedRef = useRef(onConnected);
	onConnectedRef.current = onConnected;
	const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(
		() => (): void => {
			if (pollTimerRef.current) {
				clearInterval(pollTimerRef.current);
			}
		},
		[],
	);

	useEffect(() => {
		const handleMessage = (event: MessageEvent): void => {
			if (event.origin !== getOAuthOrigin() || !event.data) {
				return;
			}

			if (event.data.type === 'jira_oauth_success' && event.data.connection_id) {
				setIsConnecting(false);
				onConnectedRef.current({
					id: event.data.connection_id,
					site: event.data.site,
				});
			} else if (event.data.type === 'jira_oauth_error') {
				setIsConnecting(false);
				notifications.error({
					message: 'Error',
					description:
						event.data.error === 'oauth_not_configured'
							? t('jira_oauth_not_configured')
							: t('jira_oauth_failed'),
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
			const session = await createJiraOAuthSession({ openerOrigin });

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
				if (pollTimerRef.current) {
					clearInterval(pollTimerRef.current);
				}
				pollTimerRef.current = setInterval(() => {
					if (popup.closed) {
						if (pollTimerRef.current) {
							clearInterval(pollTimerRef.current);
							pollTimerRef.current = null;
						}
						setIsConnecting(false);
					}
				}, 500);
			}
		} catch (error) {
			setIsConnecting(false);
			notifications.error({
				message: (error as APIError).getErrorCode?.() || 'Error',
				description:
					(error as APIError).getErrorMessage?.() || t('jira_oauth_failed'),
			});
		}
	}, [notifications, t]);

	return { connect, isConnecting };
}
