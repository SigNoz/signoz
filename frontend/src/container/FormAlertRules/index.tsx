import React from 'react';
import { Form, FormInstance, Input, Typography } from 'antd';
const { Title } = Typography;
import { Store } from 'antd/lib/form/interface';
import FormItem from 'antd/lib/form/FormItem';
import QueryBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder';
function FormAlertRules({
	formInstance,
	initialValue,
	title,
}: FormAlertRuleProps): JSX.Element {
	return (
		<>
			<Title level={3}>{title}</Title>
			<Form initialValues={initialValue} layout="vertical" form={formInstance}>
				<FormItem label="Name" labelAlign="left" name="name">
					<Input />
				</FormItem>

				<QueryBuilder
					key="12"
					name="A"
					updateQueryData={(updatedQuery: any): void =>
						console.log('do nothing', updatedQuery)
					}
					onDelete={(): void => console.log('do nothing')}
					queryData={{
						name: 'A',
						disabled: false,

						promQL: {
							query: '',
							legend: '',
						},
						clickHouseQuery: '',
						queryBuilder: {
							metricName: null,
							aggregateOperator: null,
							tagFilters: {
								op: 'AND',
								items: [],
							},
							groupBy: [],
						},
					}}
					queryCategory={0}
				/>
			</Form>
		</>
	);
}

interface FormAlertRuleProps {
	formInstance: FormInstance;
	initialValue: Store;
	title: string;
}

export default FormAlertRules;
