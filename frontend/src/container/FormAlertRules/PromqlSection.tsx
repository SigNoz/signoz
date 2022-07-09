import { Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import PromQLQueryBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL/query';
import { IPromQLQueryHandleChange } from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL/types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IPromQueries } from 'types/api/alerts/compositeQuery';

function PromqlSection({
	promQueries,
	setPromQueries,
}: PromqlSectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');
	const handlePromQLQueryChange = ({
		query,
		legend,
		toggleDelete,
	}: IPromQLQueryHandleChange): void => {
		let promQuery = promQueries.A;

		// todo(amol): how to remove query, make it null?
		if (query) promQuery.query = query;
		if (legend) promQuery.legend = legend;
		if (toggleDelete) {
			promQuery = {
				query: '',
				legend: '',
				name: 'A',
				disabled: false,
			};
		}
		setPromQueries({
			A: {
				...promQuery,
			},
		});
	};
	return (
		<PromQLQueryBuilder
			key="A"
			queryIndex="A"
			queryData={promQueries?.A}
			handleQueryChange={handlePromQLQueryChange}
		/>
	);
}

interface PromqlSectionProps {
	promQueries: IPromQueries;
	setPromQueries: (p: IPromQueries) => void;
}

export default PromqlSection;
