import { Switch } from 'antd';
import React, { useState } from 'react';
import { SAMLDomain } from 'types/api/SAML/listDomain';

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
			ssoEnforce: checked,
		});

		if (response) {
			setIsChecked(checked);
		}
		setIsLoading(false);
	};

	return (
		<Switch
			loading={isLoading}
			disabled={isLoading}
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
