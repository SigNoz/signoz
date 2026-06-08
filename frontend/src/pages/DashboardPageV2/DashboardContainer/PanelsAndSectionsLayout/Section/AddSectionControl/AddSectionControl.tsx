import { useCallback, useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import type { DashboardtypesLayoutDTO } from 'api/generated/services/sigNoz.schemas';

import type { DashboardSection } from '../../../utils';
import { useAddSection } from '../hooks/useAddSection';
import { useFirstSectionMigration } from '../hooks/useFirstSectionMigration';
import FirstSectionMigrationModal from '../FirstSectionMigrationModal';
import styles from './AddSectionControl.module.scss';

const DEFAULT_SECTION_TITLE = 'New section';

interface AddSectionControlProps {
	sections: DashboardSection[];
	layouts: DashboardtypesLayoutDTO[] | undefined | null;
	isSectioned: boolean;
}

function AddSectionControl({
	sections,
	layouts,
	isSectioned,
}: AddSectionControlProps): JSX.Element {
	const [isMigrationOpen, setIsMigrationOpen] = useState(false);
	const { addSection } = useAddSection({ layouts });
	const { migrate, isSaving } = useFirstSectionMigration({ sections });

	// Free-flowing dashboard with existing panels → must migrate before sections
	// can coexist (every panel must belong to a section once any exists).
	const needsMigration =
		!isSectioned && sections.some((s) => s.items.length > 0);

	const handleClick = useCallback((): void => {
		if (needsMigration) {
			setIsMigrationOpen(true);
			return;
		}
		void addSection(DEFAULT_SECTION_TITLE);
	}, [needsMigration, addSection]);

	const handleConfirmMigration = useCallback(async (): Promise<void> => {
		await migrate(DEFAULT_SECTION_TITLE);
		setIsMigrationOpen(false);
	}, [migrate]);

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				className={styles.addButton}
				onClick={handleClick}
				data-testid="add-section"
			>
				<Plus size={14} />
				Add section
			</Button>
			<FirstSectionMigrationModal
				open={isMigrationOpen}
				isSaving={isSaving}
				onClose={(): void => setIsMigrationOpen(false)}
				onConfirm={handleConfirmMigration}
			/>
		</>
	);
}

export default AddSectionControl;
