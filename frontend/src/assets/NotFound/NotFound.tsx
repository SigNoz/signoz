import DecorativeImage from 'components/DecorativeImage/DecorativeImage';
import './style.scss';

function NotFound(): JSX.Element {
	return <DecorativeImage src="/Images/notFound404.png" className="not-found-image" />;
}

export default NotFound;
