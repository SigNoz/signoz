import { useEffect } from 'react';

type UseClickOutsideProps = {
	ref: React.RefObject<HTMLElement>;
	onClickOutside: () => void;
	eventType?: 'mousedown' | 'mouseup' | 'click' | 'dblclick';
};

const useClickOutside = ({
	ref,
	onClickOutside,
	eventType,
}: UseClickOutsideProps): void => {
	const handleClickOutside = (event: MouseEvent): void => {
		if (ref.current && !ref.current.contains(event.target as Node)) {
			onClickOutside();
		}
	};

	useEffect(() => {
		document.addEventListener(eventType ?? 'click', handleClickOutside);

		return (): void => {
			document.removeEventListener(eventType ?? 'click', handleClickOutside);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ref, onClickOutside]);
};

export default useClickOutside;
