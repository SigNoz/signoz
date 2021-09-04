const getMicroSeconds = ({ time }: getMicroSecondsProps): string => {
	return (time / 100).toString();
};

interface getMicroSecondsProps {
	time: number;
}

export default getMicroSeconds;
