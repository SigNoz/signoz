import { Dispatch, SetStateAction, useState } from 'react';
import { ContextLinkProps } from 'types/api/dashboard/getAll';

interface ContextLinkModalProps {
	isModalOpen: boolean;
	selectedContextLink: ContextLinkProps | null;
	handleEditContextLink: (contextLink: ContextLinkProps) => void;
	handleAddContextLink: () => void;
	handleCancelModal: () => void;
	handleSaveContextLink: (newContextLink: ContextLinkProps) => void;
}

const useContextLinkModal = ({
	setContextLinks,
}: {
	setContextLinks: Dispatch<SetStateAction<ContextLinkProps[]>>;
}): ContextLinkModalProps => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [
		selectedContextLink,
		setSelectedContextLink,
	] = useState<ContextLinkProps | null>(null);

	const handleEditContextLink = (contextLink: ContextLinkProps): void => {
		setSelectedContextLink(contextLink);
		setIsModalOpen(true);
	};

	const handleAddContextLink = (): void => {
		setSelectedContextLink(null);
		setIsModalOpen(true);
	};

	const handleCancelModal = (): void => {
		setIsModalOpen(false);
		setSelectedContextLink(null);
	};

	const handleSaveContextLink = (newContextLink: ContextLinkProps): void => {
		setContextLinks((prev) => {
			const links = [...prev];
			const existing = links.filter((link) => link.id === newContextLink.id)[0];
			if (existing) {
				const idx = links.findIndex((link) => link.id === newContextLink.id);
				links[idx] = { ...existing, ...newContextLink };
				return links;
			}
			links.push(newContextLink);
			return links;
		});
		setIsModalOpen(false);
		setSelectedContextLink(null);
	};

	return {
		isModalOpen,
		selectedContextLink,
		handleEditContextLink,
		handleAddContextLink,
		handleCancelModal,
		handleSaveContextLink,
	};
};

export default useContextLinkModal;
