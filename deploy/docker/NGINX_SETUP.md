# SigNoz with Nginx Reverse Proxy (HTTPS)

This guide explains how to deploy SigNoz with an Nginx reverse proxy to enable HTTPS access on port 443 while keeping the default port 8080 unchanged.

## Overview

By default, SigNoz runs on port 8080 (HTTP). This configuration adds an Nginx reverse proxy that:
- Listens on port 443 (HTTPS)
- Proxies requests to SigNoz on port 8080
- Maintains all existing service ports unchanged

## Prerequisites

- Docker and Docker Compose installed
- OpenSSL (for generating SSL certificates)
- SigNoz deployment files

## Setup Instructions

### 1. Generate SSL Certificates

Before starting the services, you need SSL certificates. For development/testing, generate self-signed certificates:

**Linux/macOS:**
```bash
cd deploy/docker
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/CN=localhost"
```

**Windows (using Docker):**
```cmd
cd deploy\docker
mkdir ssl
docker run --rm -v "%cd%\ssl:/certs" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/key.pem -out /certs/cert.pem -subj "/CN=localhost"
```

Or simply run the provided script:
```cmd
generate-ssl.bat
```

For production, use certificates from a trusted Certificate Authority (CA) like Let's Encrypt.

### 2. Deploy with Docker Compose

Start all services including the Nginx reverse proxy:

```bash
docker compose -f docker-compose.nginx.yaml up -d
```

### 3. Verify Deployment

Check that all services are running:

```bash
docker compose -f docker-compose.nginx.yaml ps
```

Access SigNoz:
- **HTTPS (via Nginx)**: https://localhost:443
- **HTTP (direct)**: http://localhost:8080

## Configuration Files

### nginx.conf

The Nginx configuration file (`nginx.conf`) contains:

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://signoz:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### docker-compose.nginx.yaml

The Nginx service is added to the existing docker-compose configuration:

```yaml
nginx:
  networks:
    - signoz-net
  restart: unless-stopped
  logging:
    options:
      max-size: 50m
      max-file: "3"
  image: nginx:alpine
  container_name: signoz-nginx
  ports:
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf
    - ./ssl:/etc/nginx/ssl
  depends_on:
    - signoz
```

## Port Mapping

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| SigNoz | 8080 | 8080 | HTTP |
| Nginx | 443 | 443 | HTTPS |
| OTLP gRPC | 4317 | 4317 | gRPC |
| OTLP HTTP | 4318 | 4318 | HTTP |

## Customization

### Change Domain Name

Update `server_name` in `nginx.conf`:

```nginx
server_name your-domain.com;
```

### Use Custom Certificates

Replace the self-signed certificates in the `ssl/` directory with your own:

```bash
cp /path/to/your/certificate.crt ssl/cert.pem
cp /path/to/your/private.key ssl/key.pem
```

### Add HTTP to HTTPS Redirect

Add a redirect server block in `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    return 301 https://$host$request_uri;
}
```

Then expose port 80 in docker-compose:

```yaml
ports:
  - "80:80"
  - "443:443"
```

## Troubleshooting

### Certificate Errors

If you see SSL certificate warnings in your browser:
- For self-signed certificates, this is expected. Accept the security exception
- For production, ensure you're using valid CA-signed certificates

### Connection Refused

Check if all services are running:

```bash
docker compose -f docker-compose.nginx.yaml logs nginx
docker compose -f docker-compose.nginx.yaml logs signoz
```

### Port Already in Use

If port 443 is already in use, change the external port mapping:

```yaml
ports:
  - "8443:443"  # Access via https://localhost:8443
```

## Stopping Services

```bash
docker compose -f docker-compose.nginx.yaml down
```

To remove volumes as well:

```bash
docker compose -f docker-compose.nginx.yaml down -v
```

## Security Considerations

1. **Production Certificates**: Always use valid CA-signed certificates in production
2. **Strong Ciphers**: Configure Nginx with strong SSL/TLS ciphers
3. **HSTS**: Enable HTTP Strict Transport Security for production
4. **Firewall**: Ensure only necessary ports are exposed

## Contributing

Contributions are welcome! Please submit issues and pull requests to the [SigNoz repository](https://github.com/SigNoz/signoz).

## License

This configuration follows the same license as SigNoz.
