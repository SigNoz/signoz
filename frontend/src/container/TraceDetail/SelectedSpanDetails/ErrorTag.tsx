import { Button, Modal } from 'antd';
import React, { useState } from 'react';
import { CustomSubText, CustomSubTitle } from './styles';

const ErrorTag = ({ keyName, value }: ErrorTagProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isEllipsed] = useState(value.length > 24);

	const onToggleHandler = (state: boolean) => {
		setIsOpen(state);
	};

	return (
		<React.Fragment key={keyName}>
			<CustomSubTitle>{keyName}</CustomSubTitle>
			<CustomSubText ellipsis={isEllipsed}>{value}</CustomSubText>
			{isEllipsed && (
				<Button onClick={() => onToggleHandler(true)} type="link">
					View full log event message
				</Button>
			)}

			<Modal
				onCancel={() => onToggleHandler(false)}
				title="Log Message"
				footer={[]}
				visible={isOpen}
				destroyOnClose
			>
				<CustomSubTitle>{keyName}</CustomSubTitle>
				<CustomSubText>{value}</CustomSubText>
			</Modal>
		</React.Fragment>
	);
};

interface ErrorTagProps {
	keyName: string;
	value: string;
}

export default ErrorTag;
