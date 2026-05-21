import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Color } from '@signozhq/design-tokens';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { CircleCheck, Link2 } from '@signozhq/icons';

import './CopyToClipboard.styles.scss';
import { Button } from '@signozhq/ui/button';

function CopyToClipboard({ textToCopy }: { textToCopy: string }): JSX.Element {
	const [state, copyToClipboard] = useCopyToClipboard();
	const [success, setSuccess] = useState(false);
	const isDarkMode = useIsDarkMode();

	useEffect(() => {
		let timer: string | number | NodeJS.Timeout | undefined;
		if (state.value) {
			setSuccess(true);
			timer = setTimeout(() => setSuccess(false), 1000);
		}

		return (): void => clearTimeout(timer);
	}, [state]);

	if (success) {
		return (
			<Button
				className="copy-to-clipboard copy-to-clipboard--success"
				variant="ghost"
				prefix={<CircleCheck size={16} color={Color.BG_FOREST_400} />}
			>
				Copied
			</Button>
		);
	}

	return (
		<Button
			onClick={(): void => copyToClipboard(textToCopy)}
			className="copy-to-clipboard"
			variant="ghost"
			prefix={
				<Link2
					size={16}
					color={isDarkMode ? Color.BG_VANILLA_400 : Color.TEXT_INK_400}
				/>
			}
		>
			Copy link
		</Button>
	);
}

export default CopyToClipboard;
