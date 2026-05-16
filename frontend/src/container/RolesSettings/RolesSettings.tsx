import { useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import AuthZTooltip from 'components/AuthZTooltip/AuthZTooltip';
import { RoleCreatePermission } from 'hooks/useAuthZ/permissions/role.permissions';

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
					Create and manage custom roles for your team.{' '}
					<a
						href="https://signoz.io/docs/manage/administrator-guide/iam/roles/"
						target="_blank"
						rel="noopener noreferrer"
						className="roles-settings-header-learn-more"
					>
						Learn more
					</a>
				</p>
			</div>
			<div className="roles-settings-content">
				<div className="roles-settings-toolbar">
					<Input
						type="search"
						placeholder="Search for roles..."
						value={searchQuery}
						onChange={(e): void => setSearchQuery(e.target.value)}
					/>
					<AuthZTooltip checks={[RoleCreatePermission]}>
						<Button
							variant="solid"
							color="primary"
							className="role-settings-toolbar-button"
							onClick={(): void => setIsCreateModalOpen(true)}
						>
							<Plus size={14} />
							Custom role
						</Button>
					</AuthZTooltip>
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
