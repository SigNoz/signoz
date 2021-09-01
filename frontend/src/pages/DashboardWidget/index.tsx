import Spinner from 'components/Spinner';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import NewWidget from 'container/NewWidget';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const DashboardWidget = (): JSX.Element => {
	const { search, pathname } = useLocation();
	const { push } = useHistory();
	const [selectedGraph, setSelectedGraph] = useState<GRAPH_TYPES>();

	useEffect(() => {
		const params = new URLSearchParams(search);
		const graphType = params.get('graphType') as GRAPH_TYPES | null;

		// if there is no graphType we are pushing to the dashboard route
		// @TODO need to update this one with useParams
		if (graphType === null) {
			const pathNameArray = pathname.split('/');
			pathNameArray.pop();
			const prevDashboard = pathNameArray.join('/');
			push(prevDashboard);
		} else {
			setSelectedGraph(graphType);
		}
	}, []);

	if (selectedGraph === undefined) {
		return <Spinner tip="Loading.." />;
	}

	return <NewWidget selectedGraph={selectedGraph} />;
};

export default DashboardWidget;
