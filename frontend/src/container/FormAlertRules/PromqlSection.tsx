import { Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { PromQueries } from 'types/api/metrics/compositeQuery';

function PromqlSection({
	promQueries,
	setPromQueries,
}: PromqlSectionProps): JSX.Element {
	return (
		<FormItem label="PromQL Expression" labelAlign="left">
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
	promQueries: PromQueries;
	setPromQueries: (p: PromQueries) => void;
}

export default PromqlSection;
