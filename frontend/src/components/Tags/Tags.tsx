import React, { Dispatch, SetStateAction, useState } from 'react';
import { Check, Plus, X } from '@signozhq/icons';
import { Flex, Tag } from 'antd';
import Input from 'components/Input';

import './Tags.styles.scss';
import { Button } from '@signozhq/ui/button';

function Tags({ tags, setTags }: AddTagsProps): JSX.Element {
	const [inputValue, setInputValue] = useState<string>('');
	const [inputVisible, setInputVisible] = useState<boolean>(false);

	const handleInputConfirm = (): void => {
		if (tags.indexOf(inputValue) > -1) {
			return;
		}

		if (inputValue) {
			setTags([...tags, inputValue]);
		}
		setInputVisible(false);
		setInputValue('');
	};

	const handleClose = (removedTag: string): void => {
		const newTags = tags.filter((tag) => tag !== removedTag);
		setTags(newTags);
	};

	const showInput = (): void => {
		setInputVisible(true);
		setInputValue('');
	};

	const hideInput = (): void => {
		setInputValue('');
		setInputVisible(false);
	};

	const onChangeHandler = (
		value: string,
		func: Dispatch<SetStateAction<string>>,
	): void => {
		func(value);
	};

	return (
		<div className="tags-container">
			{tags.map<React.ReactNode>((tag) => (
				<Tag
					key={tag}
					closable
					style={{ userSelect: 'none' }}
					onClose={(): void => handleClose(tag)}
				>
					<span>{tag}</span>
				</Tag>
			))}

			{inputVisible && (
				<div className="add-tag-container">
					<Input
						type="text"
						// oxlint-disable-next-line jsx_a11y/no-autofocus
						autoFocus
						value={inputValue}
						onChangeHandler={(event): void =>
							onChangeHandler(event.target.value, setInputValue)
						}
						onPressEnterHandler={handleInputConfirm}
					/>

					<div className="confirm-cancel-actions">
						<Button
							onClick={handleInputConfirm}
							size="sm"
							prefix={<Check size={14} />}
							variant="outlined"
							color="secondary"
						/>

						<Button
							onClick={hideInput}
							size="sm"
							prefix={<X size={14} />}
							variant="outlined"
							color="secondary"
						/>
					</div>
				</div>
			)}

			{!inputVisible && (
				<Button
					style={{
						fontSize: '11px',
					}}
					onClick={showInput}
					size="sm"
					prefix={<Plus size={14} />}
				>
					<Flex justify="center" align="center" gap={4}>
						New Tag
					</Flex>
				</Button>
			)}
		</div>
	);
}

interface AddTagsProps {
	tags: string[];
	setTags: Dispatch<SetStateAction<string[]>>;
}

export default Tags;
