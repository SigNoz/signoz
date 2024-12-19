import { useEffect } from 'react';

type UseClickOutsideProps = {
	ref: React.RefObject<HTMLElement>;
	onClickOutside: () => void;
};

const useClickOutside = ({
	ref,
	onClickOutside,
}: UseClickOutsideProps): void => {
	const handleClickOutside = (event: MouseEvent): void => {
		if (ref.current && !ref.current.contains(event.target as Node)) {
			onClickOutside();
		}
	};

	useEffect(() => {
		document.addEventListener('click', handleClickOutside);

		return (): void => {
			document.removeEventListener('click', handleClickOutside);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ref, onClickOutside]);
};

export default useClickOutside;
