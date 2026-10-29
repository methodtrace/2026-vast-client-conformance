Test-only self-signed certificate for https://localhost (IMA cells of the browser runner). Not a secret; generated with:
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 3650 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
