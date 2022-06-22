import { Tooltip } from 'antd';
import React from 'react';

function TabHeader({ tabName, hasUnstagedChanges }) {
	return (
		<div
			style={{
				display: 'flex',
				gap: '0.5rem',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			{tabName}
			{hasUnstagedChanges && (
				<Tooltip title="Looks like you have un-staged changes. Make sure you click 'Stage & Run Query' if you want to save these changes.">
					<div
						style={{
							height: '0.6rem',
							width: '0.6rem',
							borderRadius: '1rem',
							background: 'orange',
						}}
					/>
				</Tooltip>
			)}
		</div>
	);
}

export default TabHeader;
