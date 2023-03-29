import { Form } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { FormTitle, FormWrapper, Input, SubmitButton } from './styles';

function SelfHostForm(): JSX.Element {
	const { t } = useTranslation(['selfhost']);

	return (
		<FormWrapper>
			<Form>
				<FormTitle>{t('form_title')}</FormTitle>
				<Form.Item noStyle name="email">
					<Input
						placeholder={t('placeholder_email')}
						type="email"
						autoFocus
						required
						id="selfHostEmail"
					/>
				</Form.Item>
				<Form.Item noStyle name="name">
					<Input
						placeholder={t('placeholder_name')}
						type="text"
						autoFocus
						id="selfHostName"
					/>
				</Form.Item>
				<Form.Item noStyle name="company">
					<Input
						placeholder={t('placeholder_company')}
						type="text"
						autoFocus
						id="selfHostCompany"
					/>
				</Form.Item>

				<SubmitButton type="primary" htmlType="submit" data-attr="selfHost">
					{t('button_submit')}
				</SubmitButton>
			</Form>
		</FormWrapper>
	);
}

export default SelfHostForm;
