type FunctionsSearchModalProps = {
	isOpen: boolean;
	onClose: () => void;
};

function FunctionsSearchModal(
	props: FunctionsSearchModalProps,
): JSX.Element | null {
	const { isOpen, onClose } = props;
	console.log('isOpen', isOpen);
	if (!isOpen) return null;
	return (
		<section title="hello world" className="functions-search-modal">
			<header>header</header>
			<div>body</div>
			<footer>footer</footer>
		</section>
	);
}

export default FunctionsSearchModal;
