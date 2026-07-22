import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import MEditor from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Check, Copy } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { useIsDarkMode } from 'hooks/useDarkMode';

import {
	defineJsonTheme,
	JSON_THEME_DARK,
	READONLY_EDITOR_OPTIONS,
} from '../monaco.config';
import { RolePermissionsData } from '../types';
import { transformResourcePermissionsToTransactionGroups } from '../hooks/useRolePermissions';

import styles from './ReadOnlyJsonViewer.module.scss';

export interface ReadOnlyJsonViewerProps {
	permissions: RolePermissionsData;
}

function ReadOnlyJsonViewer({
	permissions,
}: ReadOnlyJsonViewerProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [copyState, copyToClipboard] = useCopyToClipboard();
	const [copied, setCopied] = useState(false);

	const jsonContent = useMemo(() => {
		if (!permissions.resources) {
			return '[]';
		}
		const transactionGroups = transformResourcePermissionsToTransactionGroups(
			permissions.resources,
		);
		return JSON.stringify(transactionGroups, null, 2);
	}, [permissions.resources]);

	useEffect(() => {
		if (copyState.value) {
			setCopied(true);
			const timer = setTimeout(() => setCopied(false), 1500);
			return (): void => clearTimeout(timer);
		}
		return undefined;
	}, [copyState]);

	const handleCopy = useCallback((): void => {
		copyToClipboard(jsonContent);
	}, [copyToClipboard, jsonContent]);

	return (
		<div
			className={styles.readOnlyJsonViewer}
			data-testid="read-only-json-viewer"
		>
			<div className={styles.editorContainer}>
				<TooltipSimple title={copied ? 'Copied!' : 'Copy JSON'}>
					<Button
						variant="ghost"
						size="sm"
						className={styles.copyButton}
						onClick={handleCopy}
						data-testid="read-only-json-viewer-copy-button"
					>
						{copied ? (
							<Check size={14} color={Color.BG_FOREST_400} />
						) : (
							<Copy
								size={14}
								color={isDarkMode ? Color.BG_VANILLA_400 : Color.TEXT_INK_400}
							/>
						)}
					</Button>
				</TooltipSimple>
				<MEditor
					value={jsonContent}
					language="json"
					options={READONLY_EDITOR_OPTIONS}
					height="100%"
					theme={isDarkMode ? JSON_THEME_DARK : 'light'}
					beforeMount={defineJsonTheme}
				/>
			</div>
		</div>
	);
}

export default ReadOnlyJsonViewer;
