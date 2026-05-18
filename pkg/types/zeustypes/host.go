package zeustypes

import (
	"net/url"

	"github.com/tidwall/gjson"
)

type Host struct {
	Name      string `json:"name" required:"true"`
	IsDefault bool   `json:"is_default" required:"true"`
	URL       string `json:"url" required:"true"`
}

type GettableHost struct {
	Name  string `json:"name" required:"true"`
	State string `json:"state" required:"true"`
	Tier  string `json:"tier" required:"true"`
	Hosts []Host `json:"hosts" required:"true"`
}

type PostableHost struct {
	Name string `json:"name" required:"true"`
}

func NewGettableHost(data []byte) *GettableHost {
	parsed := gjson.ParseBytes(data)
	dns := parsed.Get("cluster.region.dns").String()

	hostResults := parsed.Get("hosts").Array()
	hosts := make([]Host, len(hostResults))

	for i, h := range hostResults {
		name := h.Get("name").String()
		hosts[i].Name = name
		hosts[i].IsDefault = h.Get("is_default").Bool()
		hosts[i].URL = (&url.URL{Scheme: "https", Host: name + "." + dns}).String()
	}

	return &GettableHost{
		Name:  parsed.Get("name").String(),
		State: parsed.Get("state").String(),
		Tier:  parsed.Get("tier").String(),
		Hosts: hosts,
	}
}
