import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import MEditor from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Check, Copy, Eye, EyeOff } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Typography } from '@signozhq/ui/typography';
import { useGetNotificationChannel } from 'api/generated/services/channels';
import Spinner from 'components/Spinner';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	defineJsonTheme,
	JSON_THEME_DARK,
	READONLY_EDITOR_OPTIONS,
} from 'container/RolesSettings/monaco.config';

import { channelToJson, hasSecrets } from '../../utils/channelJson';
import styles from './ChannelJsonDialog.module.scss';

interface ChannelJsonDialogProps {
	channelId: string;
	channelName: string;
	onClose: () => void;
}

function ChannelJsonDialog({
	channelId,
	channelName,
	onClose,
}: ChannelJsonDialogProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [copyState, copyToClipboard] = useCopyToClipboard();
	const [copied, setCopied] = useState(false);
	const [showSecrets, setShowSecrets] = useState(false);

	const { data, isLoading } = useGetNotificationChannel({ id: channelId });
	const channel = data?.data;

	const json = useMemo(
		() => (channel ? channelToJson(channel, showSecrets) : ''),
		[channel, showSecrets],
	);

	useEffect(() => {
		if (copyState.value) {
			setCopied(true);
			const timer = setTimeout(() => setCopied(false), 1500);
			return (): void => clearTimeout(timer);
		}
		return undefined;
	}, [copyState]);

	const handleCopy = useCallback(
		(): void => copyToClipboard(json),
		[copyToClipboard, json],
	);

	const kindHasSecrets = channel ? hasSecrets(channel.config.kind) : false;

	return (
		<DrawerWrapper
			open
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title={channelName}
			subTitle="Channel JSON"
			width="wide"
			testId="channel-json-dialog"
		>
			{isLoading || !channel ? (
				<Spinner tip="Loading channel..." />
			) : (
				<div className={styles.body}>
					<div className={styles.toolbar}>
						{kindHasSecrets && (
							<Typography.Text color="muted" size="sm">
								{showSecrets ? 'Credentials are visible.' : 'Credentials are hidden.'}
							</Typography.Text>
						)}
						<span className={styles.spacer} />
						{kindHasSecrets && (
							<Button
								variant="outlined"
								color="secondary"
								size="sm"
								prefix={showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
								onClick={(): void => setShowSecrets((value) => !value)}
								testId="channel-json-toggle-secrets"
							>
								{showSecrets ? 'Hide credentials' : 'Show credentials'}
							</Button>
						)}
						<Button
							variant="outlined"
							color="secondary"
							size="sm"
							prefix={
								copied ? (
									<Check size={14} color={Color.BG_FOREST_400} />
								) : (
									<Copy size={14} />
								)
							}
							onClick={handleCopy}
							testId="channel-json-copy"
						>
							{copied ? 'Copied' : 'Copy'}
						</Button>
					</div>

					<div className={styles.editor}>
						<MEditor
							value={json}
							language="json"
							options={READONLY_EDITOR_OPTIONS}
							height="100%"
							theme={isDarkMode ? JSON_THEME_DARK : 'light'}
							beforeMount={defineJsonTheme}
						/>
					</div>
				</div>
			)}
		</DrawerWrapper>
	);
}

export default ChannelJsonDialog;
