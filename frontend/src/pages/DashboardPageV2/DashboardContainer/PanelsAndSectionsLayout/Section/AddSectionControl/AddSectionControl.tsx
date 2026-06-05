import { useState } from 'react';
import { Plus } from '@signozhq/icons';
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

	const handleClick = (): void => {
		if (needsMigration) {
			setIsMigrationOpen(true);
			return;
		}
		void addSection(DEFAULT_SECTION_TITLE);
	};

	const handleConfirmMigration = async (): Promise<void> => {
		await migrate(DEFAULT_SECTION_TITLE);
		setIsMigrationOpen(false);
	};

	return (
		<>
			<button
				type="button"
				className={styles.addButton}
				onClick={handleClick}
				data-testid="add-section"
			>
				<Plus size={14} />
				Add section
			</button>
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
