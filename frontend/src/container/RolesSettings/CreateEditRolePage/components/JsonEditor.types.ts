import { ResourcePermissions } from '../../types';

export type EditorMode = 'interactive' | 'json';

export interface JsonEditorProps {
	resources: ResourcePermissions[];
	mode: EditorMode;
	onChange: (resources: ResourcePermissions[]) => void;
	onValidityChange?: (hasError: boolean) => void;
}

export interface JsonEditorRef {
	hasParseError: () => boolean;
}
