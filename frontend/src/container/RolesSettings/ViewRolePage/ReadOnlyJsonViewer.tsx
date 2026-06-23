import { useMemo } from 'react';
import MEditor from '@monaco-editor/react';
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

	const jsonContent = useMemo(() => {
		if (!permissions.resources) {
			return '[]';
		}
		const transactionGroups = transformResourcePermissionsToTransactionGroups(
			permissions.resources,
		);
		return JSON.stringify(transactionGroups, null, 2);
	}, [permissions.resources]);

	return (
		<div
			className={styles.readOnlyJsonViewer}
			data-testid="read-only-json-viewer"
		>
			<div className={styles.editorContainer}>
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
