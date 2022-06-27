import { SaveOutlined } from '@ant-design/icons';
import { Button, Form, FormInstance, notification } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import { Store } from 'antd/lib/form/interface';
import React, { useCallback, useState } from 'react';
import { AlertDef } from 'types/api/alerts/create';

import BasicInfo from './BasicInfo';
import QuerySection from './QuerySection';
import RuleOptions from './RuleOptions';
import { ActionButton, ButtonContainer } from './styles';
import { baseQuery, defaultAlert, Query, QueryType } from './types';

function FormAlertRules({
	formInstance,
	initialValue,
	initQueries,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	console.log('FormAlertRules:', initialValue);
	console.log('FormAlertRules:', ruleId);
	const [notifications, Element] = notification.useNotification();

	const [loading, setLoading] = useState(false);

	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);

	const [queryCategory, setQueryCategory] = useState<QueryType>(0);
	const [queryList, setQueryList] = useState<Array<Query>>(initQueries);

	const onSaveHandler = useCallback(async () => {
		console.log('saved');
	}, [notifications, queryList]);

	const renderBasicInfo = (): JSX.Element => {
		return <BasicInfo alertDef={alertDef} setAlertDef={setAlertDef} />;
	};

	return (
		<>
			{Element}
			<Form initialValues={initialValue} layout="vertical" form={formInstance}>
				<FormItem labelAlign="left" name="query">
					<QuerySection
						queryList={queryList}
						setQueryList={setQueryList}
						queryCategory={queryCategory}
						setQueryCategory={setQueryCategory}
					/>
				</FormItem>
				<RuleOptions
					ruleType={queryCategory === 2 ? 'prom_rule' : 'threshold_rule'}
				/>
				{renderBasicInfo()}
				<ButtonContainer>
					<ActionButton
						loading={loading || false}
						type="primary"
						onClick={onSaveHandler}
						icon={<SaveOutlined />}
					>
						Save Alert
					</ActionButton>
					<ActionButton
						loading={loading || false}
						type="default"
						onClick={(e): void => console.log('do nothing')}
					>
						Cancel
					</ActionButton>
				</ButtonContainer>
			</Form>
		</>
	);
}

interface FormAlertRuleProps {
	formInstance: FormInstance;
	initialValue: Store;
	ruleId: string;
}

export default FormAlertRules;
