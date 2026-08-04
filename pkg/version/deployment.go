package version

import (
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	gotime "time"
)

var (
	current = Deployment{mode: "unknown", platform: "unknown", os: "unknown", arch: "unknown"}
	once    = sync.Once{}
)

type Deployment struct {
	// mode of deployment, e.g. kubernetes, binary, etc.
	mode string

	// platform of deployment, e.g. heroku, render, aws, gcp, azure, digitalocean, etc.
	platform string

	// os of deployment, e.g. linux, darwin, etc.
	os string

	// arch of deployment, e.g. amd64, arm64, etc.
	arch string
}

func NewDeployment() Deployment {
	once.Do(func() {
		current.mode = detectMode()
		current.platform = detectPlatform()
		current.os = runtime.GOOS
		current.arch = runtime.GOARCH
	})

	return current
}

func (d Deployment) Mode() string {
	return d.mode
}

func (d Deployment) Platform() string {
	return d.platform
}

func (d Deployment) OS() string {
	return d.os
}

func (d Deployment) Arch() string {
	return d.arch
}

func detectMode() string {
	// Check if running in Kubernetes
	if os.Getenv("KUBERNETES_SERVICE_HOST") != "" {
		return "kubernetes"
	}

	// Check if running in a container and identify the runtime
	if data, err := os.ReadFile("/proc/self/cgroup"); err == nil {
		cgroupData := string(data)
		switch {
		case strings.Contains(cgroupData, "docker"):
			return "docker"
		case strings.Contains(cgroupData, "containerd"):
			return "containerd"
		case strings.Contains(cgroupData, "libpod") || strings.Contains(cgroupData, "podman"):
			return "podman"
		case strings.Contains(cgroupData, "crio"):
			return "cri-o"
		}
	}

	// Check if running as a binary
	if exe, err := os.Executable(); err == nil {
		// Check if the executable is in a standard binary location
		exePath := filepath.Clean(exe)
		if strings.HasPrefix(exePath, "/usr/local/bin/") ||
			strings.HasPrefix(exePath, "/usr/bin/") ||
			strings.HasPrefix(exePath, "/bin/") ||
			strings.HasPrefix(exePath, "/opt/") {
			return "binary"
		}

		// Check if the executable is in the current directory
		if filepath.Dir(exePath) == "." || filepath.Dir(exePath) == filepath.Clean(os.Getenv("PWD")) {
			return "binary"
		}
	}

	return "unknown"
}

func detectPlatform() string {
	// Check for PaaS platforms first as they use environment variables
	switch {
	case os.Getenv("DYNO") != "" || os.Getenv("HEROKU_APP_ID") != "":
		return "heroku"
	case os.Getenv("RENDER") != "" || os.Getenv("RENDER_SERVICE_ID") != "":
		return "render"
	case os.Getenv("COOLIFY_RESOURCE_UUID") != "":
		return "coolify"
	case os.Getenv("RAILWAY_SERVICE_ID") != "":
		return "railway"
	case os.Getenv("ECS_CONTAINER_METADATA_URI_V4") != "":
		return "ecs"
	case os.Getenv("NOMAD_ALLOC_ID") != "":
		return "nomad"
	case os.Getenv("CONTAINER_APP_HOSTNAME") != "":
		return "aca"
	case os.Getenv("FLY_APP_NAME") != "":
		return "flyio"
	}

	// Try to detect cloud provider through metadata endpoints
	client := &http.Client{Timeout: 1 * gotime.Second}

	// Vultr metadata, Must come before AWS Detection — Vultr exposes the AWS IMDS endpoint, causing false AWS detection.
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/v1/hostname", nil); err == nil {
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "vultr"
			}
		}
	}

	// OpenStack metadata (OVHcloud and other OpenStack providers), Must come before AWS Detection — OpenStack exposes an EC2-compatible endpoint, causing false AWS detection.
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/openstack", nil); err == nil {
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "openstack"
			}
		}
	}

	// AWS metadata
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/latest/meta-data/", nil); err == nil {
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "aws"
			}
		}
	}

	// GCP metadata
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/computeMetadata/v1/", nil); err == nil {
		req.Header.Add("Metadata-Flavor", "Google")
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "gcp"
			}
		}
	}

	// Azure metadata
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/metadata/instance?api-version=2017-03-01", nil); err == nil {
		req.Header.Add("Metadata", "true")
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "azure"
			}
		}
	}

	// Digitalocean metadata
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/metadata/v1/", nil); err == nil {
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "digitalocean"
			}
		}
	}

	// Hetzner metadata
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/hetzner/v1/metadata", nil); err == nil {
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "hetzner"
			}
		}
	}

	// Oracle metadata
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/opc/v2/instance/", nil); err == nil {
		req.Header.Add("Authorization", "Bearer Oracle")
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "oracle"
			}
		}
	}

	// Alibaba metadata
	if req, err := http.NewRequest(http.MethodGet, "http://100.100.100.200/latest/meta-data/", nil); err == nil {
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "alibaba"
			}
		}
	}

	// Akamai (Linode) metadata (requires token handshake)
	if req, err := http.NewRequest(http.MethodPut, "http://169.254.169.254/v1/token", nil); err == nil {
		req.Header.Add("Metadata-Token-Expiry-Seconds", "3600")
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "akamai"
			}
		}
	}

	// IBM metadata (requires token handshake)
	if req, err := http.NewRequest(http.MethodPut, "http://169.254.169.254/instance_identity/v1/token?version=2022-03-08", nil); err == nil {
		req.Header.Add("Metadata-Flavor", "ibm")
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "ibm"
			}
		}
	}

	// Scaleway metadata
	if req, err := http.NewRequest(http.MethodGet, "http://169.254.42.42/conf", nil); err == nil {
		if resp, err := client.Do(req); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return "scaleway"
			}
		}
	}

	return "unknown"
}
