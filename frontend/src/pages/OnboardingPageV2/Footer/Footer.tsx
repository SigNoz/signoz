
import './Footer.styles.scss';
import { ArrowUpRight } from 'lucide-react';

export function Footer(): JSX.Element {
    return (
        <section className='footer-main-container'>
            <div className="footer-container">
                <a href="https://trust.signoz.io/" target="_blank" className='footer-content'>
                    <img src="/logos/hippa.svg" alt="HIPPA" className='footer-logo' />
                    <span className='footer-text'>HIPPA</span>
                </a>
                <img src="/icons/dott.svg" alt="dot" className='footer-dot' />
                <a href="https://trust.signoz.io/" target="_blank" className='footer-content'>
                    <img src="/logos/soc2.svg" alt="SOC2" className='footer-logo' />
                    <span className='footer-text'>SOC2</span>
                </a>
                <img src="/icons/dott.svg" alt="dot" className='footer-dot' />
                <a href="https://signoz.io/" target="_blank" className='footer-link'> {/* Please add correct url*/}                    
                    <span className='footer-text'>Privacy</span> <ArrowUpRight size={14} />
                </a>
                <img src="/icons/dott.svg" alt="dot" className='footer-dot' />
                <a href="https://signoz.io/" target="_blank" className='footer-link'> {/* Please add correct url*/} 
                    <span className='footer-text'>Security</span> <ArrowUpRight size={14} />
                </a>
            </div>
        </section>
    )
}
