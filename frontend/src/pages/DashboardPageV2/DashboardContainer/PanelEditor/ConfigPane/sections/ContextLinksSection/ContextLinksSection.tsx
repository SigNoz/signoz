import { useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import type { DashboardLinkDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ContextLinkDialog from './ContextLinkDialog';
import ContextLinkListItem from './ContextLinkListItem';
import { useContextLinkVariables } from './useContextLinkVariables';

import styles from './ContextLinksSection.module.scss';

/**
 * Edits the panel's context links (`spec.links`) as a list of saved links, each added or
 * edited through a modal ({@link ContextLinkDialog}) that carries V1's full authoring UX
 * (variable autocomplete, URL-parameters editor, validation).
 */
function ContextLinksSection({
	value,
	onChange,
}: SectionEditorProps<SectionKind.ContextLinks>): JSX.Element {
	const links = value ?? [];
	const variables = useContextLinkVariables();

	// `index === null` while adding a new link; a number while editing an existing one.
	const [dialog, setDialog] = useState<{ open: boolean; index: number | null }>({
		open: false,
		index: null,
	});

	const removeAt = (index: number): void =>
		onChange(links.filter((_, i) => i !== index));

	const handleSave = (link: DashboardLinkDTO): void => {
		onChange(
			dialog.index === null
				? [...links, link]
				: links.map((existing, i) => (i === dialog.index ? link : existing)),
		);
		setDialog((d) => ({ ...d, open: false }));
	};

	const editingLink =
		dialog.index !== null ? (links[dialog.index] ?? null) : null;

	return (
		<div className={styles.list}>
			{links.map((link, index) => (
				<ContextLinkListItem
					// Links have no stable id on the wire; index is the row identity here.
					// eslint-disable-next-line react/no-array-index-key
					key={index}
					link={link}
					index={index}
					onEdit={(): void => setDialog({ open: true, index })}
					onRemove={(): void => removeAt(index)}
				/>
			))}

			<Button
				type="button"
				variant="dashed"
				color="secondary"
				prefix={<Plus size={14} />}
				data-testid="panel-editor-v2-add-link"
				onClick={(): void => setDialog({ open: true, index: null })}
			>
				Add Context Link
			</Button>

			<ContextLinkDialog
				open={dialog.open}
				initialLink={editingLink}
				variables={variables}
				onOpenChange={(open): void => setDialog((d) => ({ ...d, open }))}
				onSave={handleSave}
			/>
		</div>
	);
}

export default ContextLinksSection;
