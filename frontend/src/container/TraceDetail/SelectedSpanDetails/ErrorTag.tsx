import { Button, Modal } from 'antd';
import useThemeMode from 'hooks/useThemeMode';
import React, { useState } from 'react';
import { CustomSubText, CustomSubTitle } from './styles';

const ErrorTag = ({ keyName, value }: ErrorTagProps) => {
	const { isDarkMode } = useThemeMode()
	const [isOpen, setIsOpen] = useState(false);
	const [isEllipsed] = useState(value.length > 24);

	const onToggleHandler = (state: boolean) => {
		setIsOpen(state);
	};

	return (
		<React.Fragment key={keyName}>
			<CustomSubTitle>{keyName}</CustomSubTitle>
			<CustomSubText isDarkMode={isDarkMode} ellipsis={isEllipsed}>{value} <br />{isEllipsed && (
				<Button onClick={() => onToggleHandler(true)} type="link" style={{ margin: 0, padding: 0 }}>
					View full log event message
				</Button>
			)}</CustomSubText>


			<Modal
				onCancel={() => onToggleHandler(false)}
				title="Log Message"
				footer={[]}
				visible={isOpen}
				destroyOnClose
			>
				<CustomSubTitle>{keyName}</CustomSubTitle>
				<CustomSubText isDarkMode={isDarkMode}>{value}</CustomSubText>
			</Modal>
		</React.Fragment>
	);
};

interface ErrorTagProps {
	keyName: string;
	value: string;
}

export default ErrorTag;
