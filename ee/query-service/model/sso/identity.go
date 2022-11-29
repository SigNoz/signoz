package model

// SSOIdentity contains details of user received from SSO provider 
// currently, we only use email to confirm a valid session
type SSOIdentity struct {
	Email string
}