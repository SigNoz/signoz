import { useState, useEffect } from 'react';
import './Questionaire1.styles.scss';
import { ArrowRight } from 'lucide-react';

interface Questionaire1Props {
    onNextPage: () => void;
}

export function Questionaire1({ onNextPage }: Questionaire1Props): JSX.Element {
    const [organisationName, setOrganisationName] = useState<string>('');
    const [usesObservability, setUsesObservability] = useState<boolean | null>(null);
    const [observabilityTool, setObservabilityTool] = useState<string | null>(null);
    const [otherTool, setOtherTool] = useState<string>('');
    const [familiarity, setFamiliarity] = useState<string | null>(null);
    const [isNextDisabled, setIsNextDisabled] = useState<boolean>(true);

    useEffect(() => {
        if (
            organisationName !== '' &&
            usesObservability !== null &&
            familiarity !== null &&
            (observabilityTool !== 'Others' || (usesObservability && otherTool !== ''))
        ) {
            setIsNextDisabled(false);
        } else {
            setIsNextDisabled(true);
        }
    }, [organisationName, usesObservability, familiarity, observabilityTool, otherTool]);

    return (
        <div className="onboarding-form-container">
            <h2>Welcome, Harsh Narayan!</h2>
            <h3>
                We&apos;ll help you get the most out of SigNoz, whether you&apos;re new to <br /> observability or a seasoned pro.
            </h3>

            <form className="onboarding-form">


                <div className="form-group">
                    <div className="question">Your Organisation Name</div>
                    <input
                        type="text"
                        id="organisation"
                        placeholder="For eg. Simpsonville..."
                        value={organisationName}
                        onChange={(e) : void => setOrganisationName(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <div className='question'>Do you currently use any observability/monitoring tool?</div>
                    <div className="radio-group">
                        <button
                            type="button"
                            className={`radio-button ${usesObservability === true ? 'active' : ''}`}
                            onClick={() : void => {
                                setUsesObservability(true);
                            }}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            className={`radio-button ${usesObservability === false ? 'active' : ''}`}
                            onClick={() : void => {
                                setUsesObservability(false);
                                setObservabilityTool(null);
                                setOtherTool('');
                            }}
                        >
                            No
                        </button>
                    </div>
                </div>

                {usesObservability && (
                    <div className="form-group">
                        <div className='question'>Which observability tool do you currently use?</div>
                        <div className="tool-grid">
                            <button
                                type="button"
                                className={`tool-button ${observabilityTool === 'AWS Cloudwatch' ? 'active' : ''}`}
                                onClick={() : void => setObservabilityTool('AWS Cloudwatch')}
                            >
                                AWS Cloudwatch
                            </button>
                            <button
                                type="button"
                                className={`tool-button ${observabilityTool === 'DataDog' ? 'active' : ''}`}
                                onClick={() : void => setObservabilityTool('DataDog')}
                            >
                                DataDog
                            </button>
                            <button
                                type="button"
                                className={`tool-button ${observabilityTool === 'New Relic' ? 'active' : ''}`}
                                onClick={() : void => setObservabilityTool('New Relic')}
                            >
                                New Relic
                            </button>
                            <button
                                type="button"
                                className={`tool-button ${observabilityTool === 'Grafana / Prometheus' ? 'active' : ''}`}
                                onClick={() : void => setObservabilityTool('Grafana / Prometheus')}
                            >
                                Grafana / Prometheus
                            </button>
                            <button
                                type="button"
                                className={`tool-button ${observabilityTool === 'Azure App Monitor' ? 'active' : ''}`}
                                onClick={() : void => setObservabilityTool('Azure App Monitor')}
                            >
                                Azure App Monitor
                            </button>
                            <button
                                type="button"
                                className={`tool-button ${observabilityTool === 'GCP-native o11y tools' ? 'active' : ''}`}
                                onClick={() : void => setObservabilityTool('GCP-native o11y tools')}
                            >
                                GCP-native o11y tools
                            </button>
                            <button
                                type="button"
                                className={`tool-button ${observabilityTool === 'Honeycomb' ? 'active' : ''}`}
                                onClick={() : void => setObservabilityTool('Honeycomb')}
                            >
                                Honeycomb
                            </button>


                            {observabilityTool === 'Others' ? (
                                <input
                                    type="text"
                                    className="tool-button input-field"
                                    placeholder="Please specify the tool"
                                    value={otherTool}
                                    onChange={(e) : void => setOtherTool(e.target.value)}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className={`tool-button ${observabilityTool === 'Others' ? 'active' : ''}`}
                                    onClick={() : void => setObservabilityTool('Others')}
                                >
                                    Others
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <div className='question'>Are you familiar with observability (o11y)?</div>
                    <div className="grid">
                        <button
                            type="button"
                            className={`grid-button ${familiarity === 'new' ? 'active' : ''}`}
                            onClick={() : void => setFamiliarity('new')}
                        >
                            I&apos;m completely new
                        </button>
                        <button
                            type="button"
                            className={`grid-button ${familiarity === 'built-stack' ? 'active' : ''}`}
                            onClick={() : void => setFamiliarity('built-stack')}
                        >
                            I&apos;ve built a stack before
                        </button>
                        <button
                            type="button"
                            className={`grid-button ${familiarity === 'experienced' ? 'active' : ''}`}
                            onClick={() : void => setFamiliarity('experienced')}
                        >
                            I have some experience
                        </button>
                        <button
                            type="button"
                            className={`grid-button ${familiarity === 'dont-know' ? 'active' : ''}`}
                            onClick={() : void => setFamiliarity('dont-know')}
                        >
                            I don&apos;t know what it is
                        </button>
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
    );
}

