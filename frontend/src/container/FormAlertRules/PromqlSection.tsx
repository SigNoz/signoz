import { Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IPromQueries } from 'types/api/alerts/compositeQuery';

function PromqlSection({
	promQueries,
	setPromQueries,
}: PromqlSectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');

	return (
		<FormItem label={t('field_promql_expr')} labelAlign="left">
			<Input
				value={promQueries?.A?.query}
				onChange={(e): void => {
					setPromQueries({
						A: {
							query: e.target.value,
							stats: '',
						},
					});
				}}
			/>
		</FormItem>
	);
}

interface PromqlSectionProps {
	promQueries: IPromQueries;
	setPromQueries: (p: IPromQueries) => void;
}

export default PromqlSection;
