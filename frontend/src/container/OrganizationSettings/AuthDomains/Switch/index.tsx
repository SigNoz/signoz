import { Switch } from 'antd';
import React, { useMemo, useState } from 'react';
import { SAMLDomain } from 'types/api/SAML/listDomain';

import { getIsValidCertificate } from '../utils';

function SwitchComponent({
	isDefaultChecked,
	onRecordUpdateHandler,
	record,
}: SwitchComponentProps): JSX.Element {
	const [isChecked, setIsChecked] = useState<boolean>(isDefaultChecked);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const onChangeHandler = async (checked: boolean): Promise<void> => {
		setIsLoading(true);
		const response = await onRecordUpdateHandler({
			...record,
			ssoEnabled: checked,
		});

		if (response) {
			setIsChecked(checked);
		}
		setIsLoading(false);
	};

	const isInValidVerificate = useMemo(
		() => !getIsValidCertificate(record?.samlConfig),
		[record],
	);

	return (
		<Switch
			loading={isLoading}
			disabled={isInValidVerificate}
			checked={isChecked}
			onChange={onChangeHandler}
		/>
	);
}

interface SwitchComponentProps {
	isDefaultChecked: boolean;
	onRecordUpdateHandler: (record: SAMLDomain) => Promise<boolean>;
	record: SAMLDomain;
}

export default SwitchComponent;
