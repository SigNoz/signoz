import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow, formatISO } from 'date-fns';
import styles from './LastUpdatedText.module.scss';

interface LastUpdatedTextProps {
	updatedAt: number | null;
}

const LastUpdatedText = memo(function LastUpdatedText({
	updatedAt,
}: LastUpdatedTextProps): JSX.Element | null {
	const [text, setText] = useState('');
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const lastUpdatedAtDate = useMemo(() => {
		if (!updatedAt) {
			return '-';
		}

		try {
			return formatISO(updatedAt);
		} catch (e) {
			console.error(e);

			return 'Failed to parse date.';
		}
	}, [updatedAt]);

	useEffect(() => {
		if (!updatedAt) {
			setText('');
			return;
		}

		const updateText = (): void => {
			setText(formatDistanceToNow(updatedAt, { addSuffix: true }));
		};

		updateText();
		intervalRef.current = setInterval(updateText, 1000);

		return (): void => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [updatedAt]);

	if (!text) {
		return null;
	}

	return (
		<span
			className={styles.lastUpdated}
			title={lastUpdatedAtDate}
			data-testid="last-updated-text"
		>
			Updated {text}
		</span>
	);
});

export default LastUpdatedText;
