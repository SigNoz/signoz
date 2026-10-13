import type { ReactNode } from 'react';
import {
	Bold,
	CodeXml,
	Heading,
	Italic,
	Link,
	List,
	ListOrdered,
	Table,
	Type,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import InsertVariableMenu from './InsertVariableMenu';
import MarkdownHelp from './MarkdownHelp';
import type { EditorCommand, EditorVariable } from './types';

import styles from './MarkdownEditor.module.scss';

const COMMAND_ICONS: Record<string, ReactNode> = {
	heading: <Heading size={14} />,
	bold: <Bold size={14} />,
	italic: <Italic size={14} />,
	'bulleted-list': <List size={14} />,
	'numbered-list': <ListOrdered size={14} />,
	link: <Link size={14} />,
	code: <CodeXml size={14} />,
	table: <Table size={14} />,
};

interface EditorToolbarProps {
	formatLabel: string;
	commands: EditorCommand[];
	onRunCommand: (command: EditorCommand) => void;
	variables: EditorVariable[];
	onInsertVariable: (name: string) => void;
	disabled: boolean;
	extra?: ReactNode;
}

function EditorToolbar({
	formatLabel,
	commands,
	onRunCommand,
	variables,
	onInsertVariable,
	disabled,
	extra,
}: EditorToolbarProps): JSX.Element {
	return (
		<div className={styles.toolbar} data-testid="markdown-editor-toolbar">
			<span className={styles.formatChip}>
				<Type size={14} />
				<Typography.Text className={styles.formatLabel}>
					{formatLabel}
				</Typography.Text>
			</span>
			<span className={styles.toolbarDivider} />
			<div className={styles.commands}>
				{commands.map((command) => (
					<TooltipSimple key={command.id} title={command.label}>
						<Button
							type="button"
							variant="ghost"
							color="secondary"
							size="icon"
							disabled={disabled}
							aria-label={command.label}
							data-testid={`markdown-command-${command.id}`}
							onClick={(): void => onRunCommand(command)}
						>
							{COMMAND_ICONS[command.id]}
						</Button>
					</TooltipSimple>
				))}
			</div>
			<div className={styles.toolbarEnd}>
				{extra}
				<InsertVariableMenu
					variables={variables}
					onSelect={onInsertVariable}
					disabled={disabled}
				/>
				<MarkdownHelp />
			</div>
		</div>
	);
}

export default EditorToolbar;
