package http

import (
	"fmt"

	http "github.com/saucesteals/fhttp"
	"github.com/saucesteals/mimic"
)

var (
	latestVersion = mimic.MustGetLatestVersion(mimic.PlatformWindows)
)

type Client struct {
	*http.Client
	ua string
	m  *mimic.ClientSpec
}

func NewClient() *Client {
	m, _ := mimic.Chromium(mimic.BrandChrome, latestVersion)

	ua := fmt.Sprintf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36", m.Version())

	client := &http.Client{
		Transport: m.ConfigureTransport(&http.Transport{
			Proxy: http.ProxyFromEnvironment,
		}),
	}

	return &Client{
		Client: client,
		ua:     ua,
		m:      m,
	}
}

func (c *Client) Do(req *http.Request) (*http.Response, error) {
	// logger.Info().Str("url", req.URL.String()).Msg("Request URL")

	req.Header = http.Header{
		"sec-ch-ua":          {c.m.ClientHintUA()},
		"rtt":                {"50"},
		"sec-ch-ua-mobile":   {"?0"},
		"user-agent":         {c.ua},
		"accept":             {"*/*"},
		"x-requested-with":   {"XMLHttpRequest"},
		"downlink":           {"3.9"},
		"ect":                {"4g"},
		"sec-ch-ua-platform": {`"Windows"`},
		"sec-fetch-site":     {"same-origin"},
		"sec-fetch-mode":     {"cors"},
		"sec-fetch-dest":     {"empty"},
		"content-type":       {"application/json; charset=UTF-8"},
		"accept-language":    {"en,en_US;q=0.9"},
		http.HeaderOrderKey: {
			"sec-ch-ua", "rtt", "sec-ch-ua-mobile",
			"user-agent", "accept", "x-requested-with",
			"downlink", "ect", "sec-ch-ua-platform",
			"sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest",
			"content-type", "accept-language",
		},
		http.PHeaderOrderKey: c.m.PseudoHeaderOrder(),
	}

	// If the request is to the localhost:3001 API, Add the JWT to the header
	if req.URL.String() == "http://localhost:3001/api/products" {
		req.Header.Set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYXBpIiwidGltZXN0YW1wIjoxNzQ0MzUxMTgxNTM2LCJpYXQiOjE3NDQzNTExODEsImV4cCI6MTc0Njk0MzE4MX0.eWwKrVn6Hq2uTMPca624ezd89Lm5dx1jfToD5I5mGaU")
	}

	return c.Client.Do(req)
}
