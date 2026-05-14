import React, { Dispatch, SetStateAction, useState } from 'react';
import { Check, Plus, X } from '@signozhq/icons';
import { Button, Flex, Tag } from 'antd';
import Input from 'components/Input';

import './Tags.styles.scss';

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
							type="primary"
							className="periscope-btn"
							size="small"
							icon={<Check size={14} />}
							onClick={handleInputConfirm}
						/>

						<Button
							type="primary"
							className="periscope-btn"
							size="small"
							icon={<X size={14} />}
							onClick={hideInput}
						/>
					</div>
				</div>
			)}

			{!inputVisible && (
				<Button
					type="primary"
					size="small"
					style={{
						fontSize: '11px',
					}}
					onClick={showInput}
				>
					<Flex justify="center" align="center" gap={4}>
						<Plus size="md" />
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
