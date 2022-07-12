import { fetchEventSource } from '@microsoft/fetch-event-source';
import SearchFilter from 'container/LogsSearchFilter';
import React, { useEffect } from 'react';

function LogsHome() {
	return (
		<>
			<div>
				<SearchFilter />
			</div>
			<div
				style={{
					width: '100%',
					height: '20vh',
					background: '#ccc2',
					margin: '1rem 0'
				}}
			>
				Graph PlaceHolder
			</div>
		</>
	);
}

export default LogsHome;
