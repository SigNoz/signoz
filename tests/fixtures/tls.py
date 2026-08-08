import datetime
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

# The integration CA is mounted into every signoz container and trusted via
# SSL_CERT_FILE (which replaces the Go root pool), so mocks that must be
# reached over TLS under a real hostname (e.g. accounts.google.com) can serve
# certificates issued by it. Material is persisted under .pytest_cache so
# --reuse runs keep the chain the running containers already trust.
CA_CONTAINER_PATH = "/etc/signoz-integration/ca.pem"
KEYSTORE_PASSWORD = "password"  # noqa: S105


def ensure_ca(pytestconfig: pytest.Config) -> Path:
    """Directory holding the integration CA (ca.pem + ca.key), created once."""
    ca_dir = pytestconfig.cache.mkdir("tls")
    if (ca_dir / "ca.pem").exists() and (ca_dir / "ca.key").exists():
        return ca_dir

    now = datetime.datetime.now(datetime.UTC)
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "signoz-integration-ca")])
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(ca_key, hashes.SHA256())
    )

    (ca_dir / "ca.pem").write_bytes(ca_cert.public_bytes(serialization.Encoding.PEM))
    (ca_dir / "ca.key").write_bytes(
        ca_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    return ca_dir


def ensure_server_keystore(pytestconfig: pytest.Config, hostname: str) -> Path:
    """Directory holding a PKCS12 keystore (keystore.p12, password
    KEYSTORE_PASSWORD) with a certificate for hostname issued by the
    integration CA."""
    ca_dir = ensure_ca(pytestconfig)
    keystore_dir = pytestconfig.cache.mkdir(f"tls-{hostname}")
    if (keystore_dir / "keystore.p12").exists():
        return keystore_dir

    ca_cert = x509.load_pem_x509_certificate((ca_dir / "ca.pem").read_bytes())
    ca_key = serialization.load_pem_private_key((ca_dir / "ca.key").read_bytes(), password=None)

    now = datetime.datetime.now(datetime.UTC)
    leaf_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    leaf_cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, hostname)]))
        .issuer_name(ca_cert.subject)
        .public_key(leaf_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=3650))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(hostname)]), critical=False)
        .add_extension(x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .sign(ca_key, hashes.SHA256())
    )

    (keystore_dir / "keystore.p12").write_bytes(
        pkcs12.serialize_key_and_certificates(
            name=hostname.encode(),
            key=leaf_key,
            cert=leaf_cert,
            cas=[ca_cert],
            encryption_algorithm=serialization.BestAvailableEncryption(KEYSTORE_PASSWORD.encode()),
        )
    )

    return keystore_dir
