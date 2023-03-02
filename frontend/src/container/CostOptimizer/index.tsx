import ROUTES from 'constants/routes';
import IngestionAnalytics from 'container/IngestionAnalytics';
import { ManageDropRules } from 'container/ManageDropRules';
import history from 'lib/history';
import React from 'react';

import SelectMenuOption from './Menu';
import { MenuOptionTypes } from './Menu/options';

function CostOpimizer(): JSX.Element {
	const pathName = history.location.pathname;
	console.log('pathName:', pathName)
	// when user appears on this page for the first time a default menu
	// is displayed. When user clicks on one of the menu items, the new url
	// is pushed. here we look for the path name to decide which component to
	// show. Instead of using state to dynamically display components, we are using
	// url path. This allows users to directly jump to a page instead of having to
	// navigate through mutliple pages.
	if (pathName === ROUTES.INGESTION_ANALYTICS) {
		return <IngestionAnalytics />;
	}
	if (pathName === ROUTES.MANAGE_DROP_RULES) {
		return <ManageDropRules />;
	}
	const onSelect = (s: MenuOptionTypes): void => {
		if (s === MenuOptionTypes.INGESTION_ANALYTICS) {
			history.push(ROUTES.INGESTION_ANALYTICS);
		}
		if (s === MenuOptionTypes.MANAGE_DROP_RULES) {
			history.push(ROUTES.MANAGE_DROP_RULES);
		}
	};

	// since we have reached here, we can assume that no menu option is selected yet.
	return <SelectMenuOption onSelect={onSelect} />;
}

export default CostOpimizer;
