import { useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { SavedViewCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';

import SaveViewModal from './SaveViewModal';
import { SavedViewsEmptyStateProps } from './types';

import styles from './SavedViewsList.module.scss';

function SavedViewsEmptyState({
	isSearching,
	isSaving,
	onSave,
}: SavedViewsEmptyStateProps): JSX.Element {
	const [isModalOpen, setIsModalOpen] = useState(false);

	if (isSearching) {
		return (
			<div className={styles.state} data-testid="saved-views-list-no-results">
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					No views match your search
				</Typography>
			</div>
		);
	}

	return (
		<div className={styles.state} data-testid="saved-views-list-empty">
			<Typography
				variant="paragraph"
				size="base"
				weight="medium"
				color="main"
				as="span"
				textOverflow="wrap"
			>
				No views yet
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				Save the current view to open it later.
			</Typography>
			<AuthZButton
				checks={[SavedViewCreatePermission]}
				variant="outlined"
				color="secondary"
				size="sm"
				prefix={<Plus size={12} />}
				onClick={(): void => setIsModalOpen(true)}
				testId="saved-views-list-create"
			>
				Create view
			</AuthZButton>
			{isModalOpen && (
				<SaveViewModal
					mode="create"
					isSaving={isSaving}
					onClose={(): void => setIsModalOpen(false)}
					onSave={onSave}
				/>
			)}
		</div>
	);
}

export default SavedViewsEmptyState;
