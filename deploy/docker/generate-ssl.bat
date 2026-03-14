@echo off
echo Generating self-signed SSL certificates...
echo.
echo Note: You need OpenSSL installed. If not available, use WSL or download from https://slproweb.com/products/Win32OpenSSL.html
echo.

docker run --rm -v "%cd%\ssl:/certs" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/key.pem -out /certs/cert.pem -subj "/CN=localhost"

echo.
echo SSL certificates generated in ssl/ directory
echo You can now start the services with: docker compose -f docker-compose.nginx.yaml up -d
