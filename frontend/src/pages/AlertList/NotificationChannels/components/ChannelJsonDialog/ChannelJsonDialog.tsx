import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import MEditor from '@monaco-editor/react';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { useGetNotificationChannel } from 'api/generated/services/channels';
import ErrorEmptyState from 'components/Alerts/ErrorEmptyState';
import Spinner from 'components/Spinner';
import { READONLY_EDITOR_OPTIONS } from 'container/RolesSettings/monaco.config';
import {
	defineJsonEditorTheme,
	JSON_EDITOR_THEME,
} from 'lib/monaco/jsonEditorTheme';

import { channelToJson, hasSecrets } from '../../utils/channelJson';
import styles from './ChannelJsonDialog.module.scss';
import ChannelJsonToolbar from './ChannelJsonToolbar';

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
	const [copyState, copyToClipboard] = useCopyToClipboard();
	const [copied, setCopied] = useState(false);
	const [showSecrets, setShowSecrets] = useState(false);

	const { data, isLoading, refetch } = useGetNotificationChannel({
		id: channelId,
	});
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

	const handleRefetch = useCallback((): void => {
		void refetch();
	}, [refetch]);

	const handleToggleSecrets = useCallback(
		(): void => setShowSecrets((value) => !value),
		[],
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
			{isLoading ? (
				<Spinner tip="Loading channel..." />
			) : !channel ? (
				<ErrorEmptyState title="Failed to load channel" onRefresh={handleRefetch} />
			) : (
				<div className={styles.body}>
					<ChannelJsonToolbar
						kindHasSecrets={kindHasSecrets}
						showSecrets={showSecrets}
						onToggleSecrets={handleToggleSecrets}
						copied={copied}
						onCopy={handleCopy}
					/>

					<div className={styles.editor}>
						<MEditor
							value={json}
							language="json"
							options={READONLY_EDITOR_OPTIONS}
							height="100%"
							theme="vs-dark"
							// the same theme the dashboard JSON drawer uses: it reads the
							// page's own tokens, so it follows light and dark
							onMount={(editor, monaco): void => {
								defineJsonEditorTheme(monaco, editor.getContainerDomNode());
								monaco.editor.setTheme(JSON_EDITOR_THEME);
							}}
						/>
					</div>
				</div>
			)}
		</DrawerWrapper>
	);
}

export default ChannelJsonDialog;
