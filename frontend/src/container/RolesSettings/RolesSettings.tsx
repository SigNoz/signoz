import { useState } from 'react';
import { Input } from '@signozhq/input';

import RolesListingTable from './RolesComponents/RolesListingTable';

import './RolesSettings.styles.scss';

function RolesSettings(): JSX.Element {
	const [searchQuery, setSearchQuery] = useState('');

	return (
		<div className="roles-settings" data-testid="roles-settings">
			<div className="roles-settings-header">
				<h3 className="roles-settings-header-title">Roles</h3>
				<p className="roles-settings-header-description">
					Create and manage custom roles for your team.
				</p>
			</div>
			<div className="roles-settings-content">
				<div className="roles-search-wrapper">
					<Input
						type="search"
						placeholder="Search for roles..."
						value={searchQuery}
						onChange={(e): void => setSearchQuery(e.target.value)}
					/>
				</div>
				<RolesListingTable searchQuery={searchQuery} />
			</div>
		</div>
	);
}

export default RolesSettings;
