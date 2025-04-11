import './AllErrors.styles.scss';

import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import cx from 'classnames';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import RouteTab from 'components/RouteTab';
import { LOCALSTORAGE } from 'constants/localStorage';
import ResourceAttributesFilterV2 from 'container/ResourceAttributeFilterV2/ResourceAttributesFilterV2';
import history from 'lib/history';
import { isNull } from 'lodash-es';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { routes } from './config';
import { ExceptionsQuickFiltersConfig } from './utils';

function AllErrors(): JSX.Element {
	const { pathname } = useLocation();

	const [showFilters, setShowFilters] = useState<boolean>(() => {
		const localStorageValue = getLocalStorageKey(
			LOCALSTORAGE.SHOW_EXCEPTIONS_QUICK_FILTERS,
		);
		if (!isNull(localStorageValue)) {
			return localStorageValue === 'true';
		}
		return true;
	});

	const handleFilterVisibilityChange = (): void => {
		setLocalStorageApi(
			LOCALSTORAGE.SHOW_EXCEPTIONS_QUICK_FILTERS,
			String(!showFilters),
		);
		setShowFilters((prev) => !prev);
	};

	return (
		<div className={cx('all-errors-page', showFilters ? 'filter-visible' : '')}>
			{showFilters && (
				<section className={cx('all-errors-quick-filter-section')}>
					<QuickFilters
						source={QuickFiltersSource.EXCEPTIONS}
						config={ExceptionsQuickFiltersConfig}
						handleFilterVisibilityChange={handleFilterVisibilityChange}
					/>
				</section>
			)}
			<section className={cx('all-errors-right-section')}>
				<ResourceAttributesFilterV2 />
				<RouteTab routes={routes} activeKey={pathname} history={history} />
			</section>
		</div>
	);
}

export default AllErrors;
