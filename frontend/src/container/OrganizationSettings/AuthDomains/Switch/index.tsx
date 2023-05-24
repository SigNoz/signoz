import { Switch } from 'antd';
import { useMemo, useState } from 'react';
import { AuthDomain } from 'types/api/SAML/listDomain';

import { isSSOConfigValid } from '../helpers';

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

	const isInValidVerificate = useMemo(() => !isSSOConfigValid(record), [record]);

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
	onRecordUpdateHandler: (record: AuthDomain) => Promise<boolean>;
	record: AuthDomain;
}

export default SwitchComponent;
