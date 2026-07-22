package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/guruvedhanth-s/reliability-agent/internal/audit"
	"github.com/guruvedhanth-s/reliability-agent/internal/evidence"
	"github.com/guruvedhanth-s/reliability-agent/internal/profile"
	"github.com/guruvedhanth-s/reliability-agent/internal/registry"
)

type Server struct {
	Registry *registry.Registry
	Audit    audit.Engine
}

func New(reg *registry.Registry) http.Handler {
	return Server{Registry: reg, Audit: audit.Engine{}}
}

func (s Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/healthz":
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	case r.Method == http.MethodGet && r.URL.Path == "/v1/profiles":
		writeJSON(w, http.StatusOK, s.Registry.List())
	case r.Method == http.MethodPost && r.URL.Path == "/v1/profiles":
		s.createProfile(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/v1/audit":
		s.runAudit(w, r)
	default:
		s.profileAction(w, r)
	}
}

func (s Server) createProfile(w http.ResponseWriter, r *http.Request) {
	var p profile.Profile
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.Registry.Put(p); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s Server) profileAction(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) == 3 && parts[0] == "v1" && parts[1] == "profiles" && r.Method == http.MethodGet {
		p, err := s.Registry.Get(parts[2])
		if err != nil {
			writeError(w, http.StatusNotFound, err)
			return
		}
		writeJSON(w, http.StatusOK, p)
		return
	}
	if len(parts) != 4 || parts[0] != "v1" || parts[1] != "profiles" || r.Method != http.MethodPost {
		writeError(w, http.StatusNotFound, errors.New("route not found"))
		return
	}
	p, err := s.Registry.Get(parts[2])
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	switch parts[3] {
	case "validate":
		writeJSON(w, http.StatusOK, map[string]any{"valid": true, "profile": p.Metadata.Name})
	case "activate":
		if err := s.Registry.Activate(p.Metadata.Name); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"active": true, "profile": p.Metadata.Name})
	default:
		writeError(w, http.StatusNotFound, errors.New("profile action not found"))
	}
}

type auditRequest struct {
	Profile  string            `json:"profile"`
	Snapshot evidence.Snapshot `json:"snapshot"`
	Now      *time.Time        `json:"now,omitempty"`
}

func (s Server) runAudit(w http.ResponseWriter, r *http.Request) {
	var request auditRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, err)
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

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
