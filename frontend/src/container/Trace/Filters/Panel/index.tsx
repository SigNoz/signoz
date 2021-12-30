import { Checkbox } from 'antd';
import React from 'react';

const Option = ({ text }: OptionProps) => {
	const isChecked = false; // can check from the reducer
	return <Checkbox checked={isChecked}>{text}</Checkbox>;
};

interface OptionProps {
	text: string;
}

export default Option;
