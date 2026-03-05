import { useState } from 'react';
import { Search } from '@signozhq/icons';

function MembersTab(): JSX.Element {
	const [searchQuery, setSearchQuery] = useState('');

	return (
		<div className="role-details-members">
			<div className="role-details-members-search">
				<Search size={12} className="role-details-members-search-icon" />
				<input
					type="text"
					className="role-details-members-search-input"
					placeholder="Search and add members..."
					value={searchQuery}
					onChange={(e): void => setSearchQuery(e.target.value)}
				/>
			</div>

			{/* Todo: Right now we are only adding the empty state in this cut */}
			<div className="role-details-members-content">
				<div className="role-details-members-empty-state">
					<span
						className="role-details-members-empty-emoji"
						role="img"
						aria-label="monocle face"
					>
						🧐
					</span>
					<p className="role-details-members-empty-text">
						<span className="role-details-members-empty-text--bold">
							No members added.
						</span>{' '}
						<span className="role-details-members-empty-text--muted">
							Start adding members to this role.
						</span>
					</p>
				</div>
			</div>
		</div>
	);
}

export default MembersTab;
