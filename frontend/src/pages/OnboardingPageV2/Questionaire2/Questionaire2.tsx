import { useState, useEffect } from 'react';
import '../Questionaire1/Questionaire1.styles.scss';
import { ArrowRight } from 'lucide-react';

interface Questionaire2Props {
    onNextPage: () => void;
}

export function Questionaire2({ onNextPage }: Questionaire2Props): JSX.Element {
    const [hearAboutSignoz, setHearAboutSignoz] = useState<string | null>(null);
    const [otherAboutSignoz, setOtherAboutSignoz] = useState<string>('');
    const [interestedSignoz, setInterestedSignoz] = useState<string | null>(null);
    const [otherInterest, setOtherInterest] = useState<string>('');
    const [isNextDisabled, setIsNextDisabled] = useState<boolean>(true);    


    useEffect((): void => {

        if (
            hearAboutSignoz !== null && 
            (hearAboutSignoz !== 'Others' || otherAboutSignoz !== '') &&
            interestedSignoz !== null &&
            (interestedSignoz !== 'Others' || otherInterest !== '')
        ) {
            setIsNextDisabled(false);
        } else {
            setIsNextDisabled(true);
        }
    }, [hearAboutSignoz, otherAboutSignoz, interestedSignoz, otherInterest]);

return (
    <div className='onboarding-form-container'>
        <h2>Tell Us About Your Interest in SigNoz</h2>
        <h3>
            We&apos;d love to know a little bit about you and your interest in SigNoz
        </h3>

        <form className='onboarding-form'>


            <div className='form-group'>
                <div className='question'>Where did you hear about SigNoz?</div>
                <div className='tool-grid'>
                    <button
                        type='button'
                        className={`tool-button ${hearAboutSignoz === 'Blog' ? 'active' : ''}`}
                        onClick={() : void => setHearAboutSignoz('Blog')}                    
                    >
                        Blog
                    </button>
                    <button
                        type='button'
                        className={`tool-button ${hearAboutSignoz === 'Hacker News' ? 'active' : ''}`}
                        onClick={() : void => setHearAboutSignoz('Hacker News')}                    
                    >
                        Hacker News
                    </button>
                    <button
                        type='button'
                        className={`tool-button ${hearAboutSignoz === 'LinkedIn' ? 'active' : ''}`}
                        onClick={() : void => setHearAboutSignoz('LinkedIn')}                    
                    >
                        LinkedIn
                    </button>
                    <button
                        type='button'
                        className={`tool-button ${hearAboutSignoz === 'Twitter' ? 'active' : ''}`}
                        onClick={() : void => setHearAboutSignoz('Twitter')}                    
                    >
                        Twitter
                    </button>
                    <button
                        type='button'
                        className={`tool-button ${hearAboutSignoz === 'Reddit' ? 'active' : ''}`}
                        onClick={() : void => setHearAboutSignoz('Reddit')}                    
                    >
                        Reddit
                    </button>
                    <button
                        type='button'
                        className={`tool-button ${hearAboutSignoz === 'colleagues/friends' ? 'active' : ''}`}
                        onClick={() : void => setHearAboutSignoz('colleagues/friends')}                    
                    >
                        colleagues/friends
                    </button>

                    {hearAboutSignoz === 'Others' ? (
                                <input
                                    type="text"
                                    className="tool-button input-field"
                                    placeholder="Please specify the tool"
                                    value={otherAboutSignoz}
                                    onChange={(e) : void => setOtherAboutSignoz(e.target.value)}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className={`tool-button ${hearAboutSignoz === 'Others' ? 'active' : ''}`}
                                    onClick={() : void => setHearAboutSignoz('Others')}
                                >
                                    Others
                                </button>
                            )}
                </div>
            </div>

            <div className='form-group'>
                <div className='question'>What are you interested in doing with SigNoz?</div>
                <div className='grid'>
                    <button
                        type="button"
                        className={`grid-button ${interestedSignoz === 'Saving costs' ? 'active': ''}`}
                        onClick={() : void => setInterestedSignoz('Saving costs')}
                    >
                        Saving costs
                    </button>
                    <button
                        type="button"
                        className={`grid-button ${interestedSignoz === 'Interested in Otel-native stack' ? 'active': ''}`}
                        onClick={() : void => setInterestedSignoz('Interested in Otel-native stack')}
                    >
                       Interested in Otel-native stack 
                    </button>
                    <button
                        type="button"
                        className={`grid-button ${interestedSignoz === 'All-in-one' ? 'active': ''}`}
                        onClick={() : void => setInterestedSignoz('All-in-one')}
                    >
                        All-in-one
                    </button>
                
                    {interestedSignoz === 'Others' ? (
                                <input
                                    type="text"
                                    className="tool-button input-field"
                                    placeholder="Please specify the tool"
                                    value={otherInterest}
                                    onChange={(e) : void => setOtherInterest(e.target.value)}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className={`tool-button ${interestedSignoz === 'Others' ? 'active' : ''}`}
                                    onClick={() : void => setInterestedSignoz('Others')}
                                >
                                    Others
                                </button>
                            )}


                </div>
            </div>

        </form>

        <div className="form-group">
                <button
                    type="submit"
                    className={`next-button ${isNextDisabled ? 'disabled' : ''}`}
                    onClick={onNextPage}
                    disabled={isNextDisabled}
                >
                    Next<ArrowRight size={14}/>
                </button>
            </div>
    </div>
)

}
