package implsession

// func handleSsoError(w http.ResponseWriter, r *http.Request, redirectURL string) {
// 	ssoError := []byte("Login failed. Please contact your system administrator")
// 	dst := make([]byte, base64.StdEncoding.EncodedLen(len(ssoError)))
// 	base64.StdEncoding.Encode(dst, ssoError)

// 	http.Redirect(w, r, fmt.Sprintf("%s?ssoerror=%s", redirectURL, string(dst)), http.StatusSeeOther)
// }

// func (h *handler) LoginPrecheck(w http.ResponseWriter, r *http.Request) {
// 	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
// 	defer cancel()

// 	email := r.URL.Query().Get("email")
// 	sourceUrl := r.URL.Query().Get("ref")
// 	orgID := r.URL.Query().Get("orgID")

// 	resp, err := h.module.LoginPrecheck(ctx, orgID, email, sourceUrl)
// 	if err != nil {
// 		render.Error(w, err)
// 		return
// 	}

// 	render.Success(w, http.StatusOK, resp)
// }

// func (h *handler) Login(w http.ResponseWriter, r *http.Request) {
// 	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
// 	defer cancel()

// 	var req types.PostableLoginRequest
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		render.Error(w, err)
// 		return
// 	}

// 	if req.RefreshToken == "" {
// 		_, err := h.module.CanUsePassword(ctx, req.Email)
// 		if err != nil {
// 			render.Error(w, err)
// 			return
// 		}
// 	}

// 	user, err := h.module.GetAuthenticatedUser(ctx, req.OrgID, req.Email, req.Password, req.RefreshToken)
// 	if err != nil {
// 		render.Error(w, err)
// 		return
// 	}

// 	jwt, err := h.module.GetJWTForUser(ctx, user)
// 	if err != nil {
// 		render.Error(w, err)
// 		return
// 	}

// 	gettableLoginResponse := &types.GettableLoginResponse{
// 		GettableUserJwt: jwt,
// 		UserID:          user.ID.String(),
// 	}

// 	render.Success(w, http.StatusOK, gettableLoginResponse)
// }

// func (h *handler) GetCurrentUserFromJWT(w http.ResponseWriter, r *http.Request) {
// 	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
// 	defer cancel()

// 	claims, err := authtypes.ClaimsFromContext(ctx)
// 	if err != nil {
// 		render.Error(w, err)
// 		return
// 	}

// 	user, err := h.module.GetUserByID(ctx, claims.OrgID, claims.UserID)
// 	if err != nil {
// 		render.Error(w, err)
// 		return
// 	}

// 	render.Success(w, http.StatusOK, user)

// }
