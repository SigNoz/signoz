package api

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/audit"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/evidence"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/registry"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/slo"
)

type Server struct {
	Registry *registry.Registry
	Audit    audit.Engine
	SLO      *slo.Engine
	MaxBody  int64
}

type Options struct {
	APIKey       string
	MaxBodyBytes int64
}

func New(reg *registry.Registry) http.Handler {
	return NewWithSLO(reg, nil)
}

func NewWithSLO(reg *registry.Registry, engine *slo.Engine) http.Handler {
	return NewWithOptions(reg, engine, Options{})
}

func NewWithOptions(reg *registry.Registry, engine *slo.Engine, options Options) http.Handler {
	if options.MaxBodyBytes <= 0 {
		options.MaxBodyBytes = 1 << 20
	}
	server := Server{
		Registry: reg,
		Audit:    audit.Engine{},
		SLO:      engine,
		MaxBody:  options.MaxBodyBytes,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /v1/profiles", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, server.Registry.List())
	})
	mux.HandleFunc("POST /v1/profiles", server.createProfile)
	mux.HandleFunc("GET /v1/profiles/{name}", server.getProfile)
	mux.HandleFunc("POST /v1/profiles/{name}/validate", server.validateProfile)
	mux.HandleFunc("POST /v1/profiles/{name}/activate", server.activateProfile)
	mux.HandleFunc("POST /v1/audit", server.runAudit)
	mux.HandleFunc("POST /v1/slo/evaluate", server.evaluateSLO)

	if options.APIKey == "" {
		return mux
	}
	return requireAPIKey(mux, options.APIKey)
}

func (s Server) createProfile(w http.ResponseWriter, r *http.Request) {
	var p profile.Profile
	if err := s.decodeJSON(w, r, &p); err != nil {
		writeDecodeError(w, err)
		return
	}
	if err := s.Registry.Put(p); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s Server) getProfile(w http.ResponseWriter, r *http.Request) {
	p, err := s.Registry.Get(r.PathValue("name"))
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s Server) validateProfile(w http.ResponseWriter, r *http.Request) {
	p, err := s.Registry.Get(r.PathValue("name"))
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	if err := p.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"valid": true, "profile": p.Metadata.Name})
}

func (s Server) activateProfile(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	p, err := s.Registry.Get(name)
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	if err := s.Registry.Activate(p.Metadata.Name); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"active": true, "profile": p.Metadata.Name})
}

type auditRequest struct {
	Profile  string            `json:"profile"`
	Snapshot evidence.Snapshot `json:"snapshot"`
	Now      *time.Time        `json:"now,omitempty"`
}

func (s Server) runAudit(w http.ResponseWriter, r *http.Request) {
	var request auditRequest
	if err := s.decodeJSON(w, r, &request); err != nil {
		writeDecodeError(w, err)
		return
	}
	p, err := s.Registry.Get(request.Profile)
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	now := time.Now()
	if request.Now != nil {
		now = *request.Now
	}
	report, err := s.Audit.Run(p, request.Snapshot, now)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, report)
}

type sloRequest struct {
	Config slo.Config `json:"config"`
	Now    *time.Time `json:"now,omitempty"`
}

func (s Server) evaluateSLO(w http.ResponseWriter, r *http.Request) {
	if s.SLO == nil {
		writeError(w, http.StatusServiceUnavailable, errors.New("SLO engine is not configured"))
		return
	}
	var request sloRequest
	if err := s.decodeJSON(w, r, &request); err != nil {
		writeDecodeError(w, err)
		return
	}
	now := time.Time{}
	if request.Now != nil {
		now = *request.Now
	}
	reports, err := s.SLO.Evaluate(r.Context(), request.Config, now)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"reports": reports})
}

func (s Server) decodeJSON(w http.ResponseWriter, r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(w, r.Body, s.MaxBody)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		if err == nil {
			return errors.New("request body must contain exactly one JSON value")
		}
		return fmt.Errorf("request body must contain exactly one JSON value: %w", err)
	}
	return nil
}

func requireAPIKey(next http.Handler, apiKey string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			next.ServeHTTP(w, r)
			return
		}
		authorization := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(authorization, "Bearer ")
		token = strings.TrimSpace(token)
		if !ok || token == "" || subtle.ConstantTimeCompare([]byte(token), []byte(apiKey)) != 1 {
			w.Header().Set("WWW-Authenticate", "Bearer")
			writeError(w, http.StatusUnauthorized, errors.New("invalid or missing API key"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeDecodeError(w http.ResponseWriter, err error) {
	var maxBytesError *http.MaxBytesError
	if errors.As(err, &maxBytesError) {
		writeError(w, http.StatusRequestEntityTooLarge, errors.New("request body is too large"))
		return
	}
	writeError(w, http.StatusBadRequest, err)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
