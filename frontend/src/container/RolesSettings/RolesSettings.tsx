import { useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button, Input } from '@signozhq/ui';

import { IS_ROLE_DETAILS_AND_CRUD_ENABLED } from './config';
import CreateRoleModal from './RolesComponents/CreateRoleModal';
import RolesListingTable from './RolesComponents/RolesListingTable';

import './RolesSettings.styles.scss';

function RolesSettings(): JSX.Element {
	const [searchQuery, setSearchQuery] = useState('');
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	return (
		<div className="roles-settings" data-testid="roles-settings">
			<div className="roles-settings-header">
				<h3 className="roles-settings-header-title">Roles</h3>
				<p className="roles-settings-header-description">
					Create and manage custom roles for your team.
				</p>
			</div>
			<div className="roles-settings-content">
				<div className="roles-settings-toolbar">
					<div className="roles-search-wrapper">
						<Input
							type="search"
							placeholder="Search for roles..."
							value={searchQuery}
							onChange={(e): void => setSearchQuery(e.target.value)}
						/>
					</div>
					{IS_ROLE_DETAILS_AND_CRUD_ENABLED && (
						<Button
							variant="solid"
							color="primary"
							className="role-settings-toolbar-button"
							onClick={(): void => setIsCreateModalOpen(true)}
						>
							<Plus size={14} />
							Custom role
						</Button>
					)}
				</div>
				<RolesListingTable searchQuery={searchQuery} />
			</div>
			<CreateRoleModal
				isOpen={isCreateModalOpen}
				onClose={(): void => setIsCreateModalOpen(false)}
			/>
		</div>
	);
}

export default RolesSettings;
