import contextlib
import datetime
import hashlib
import os
import uuid
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# The integration CA is mounted into the directory Go scans for system roots,
# so signoz containers trust it in addition to the bundled Debian roots (not
# instead of them, which is what SSL_CERT_FILE would do) and mocks that must be
# reached over TLS under a real hostname (e.g. accounts.google.com) can serve
# certificates issued by it via issue_server_keystore.
CA_CONTAINER_PATH = "/etc/ssl/certs/signoz-integration-ca.pem"
KEYSTORE_PASSWORD = "password"  # noqa: S105

# Containers chained to the CA carry its id as this label; comparing it against
# the current CA spots reused containers built against a rotated CA (or before
# the CA existed) so they can be recreated instead of failing TLS opaquely.
CA_ID_LABEL = "signoz.integration.ca"


def ca_id(tls: types.TLS) -> str:
    return hashlib.sha256(Path(tls.ca_cert_path).read_bytes()).hexdigest()[:12]


@pytest.fixture(name="tls", scope="package")
def tls(
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TLS:
    """The integration CA. Server certificates for mocks are issued from it
    with issue_server_keystore.

    The CA cannot live in tmpfs: pytest wipes basetemp at every session start,
    while reused containers (and the keystores issued for them in later
    sessions) must keep chaining to the same CA. The pytest cache directory is
    the cross-session store, like the reuse metadata itself."""

    def create() -> types.TLS:
        # Each CA gets a fresh directory: a run without --reuse must never
        # rotate the files that a parked stack's containers bind-mount.
        ca_dir = pytestconfig.cache.mkdir("tls") / uuid.uuid4().hex
        ca_dir.mkdir()

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

        return types.TLS(ca_cert_path=str(ca_dir / "ca.pem"), ca_key_path=str(ca_dir / "ca.key"))

    def delete(tls: types.TLS) -> None:
        for path in (tls.ca_cert_path, tls.ca_key_path):
            try:
                os.remove(path)
            except FileNotFoundError:
                logger.info("CA file %s already gone", path)
        with contextlib.suppress(OSError):
            os.rmdir(Path(tls.ca_cert_path).parent)

    def restore(cache: dict) -> types.TLS:
        return types.TLS.from_cache(cache)

    def stale(tls: types.TLS) -> bool:
        return not (Path(tls.ca_cert_path).is_file() and Path(tls.ca_key_path).is_file())

    return reuse.wrap(
        request,
        pytestconfig,
        "tls",
        lambda: types.TLS(ca_cert_path="", ca_key_path=""),
        create,
        delete,
        restore,
        stale=stale,
    )


def issue_server_keystore(tls: types.TLS, directory: Path, hostname: str) -> Path:
    """Write a PKCS12 keystore (keystore.p12, password KEYSTORE_PASSWORD) into
    directory, holding a certificate for hostname issued by the integration CA.
    Mount it into a mock container that must serve TLS as hostname."""
    ca_cert = x509.load_pem_x509_certificate(Path(tls.ca_cert_path).read_bytes())
    ca_key = serialization.load_pem_private_key(Path(tls.ca_key_path).read_bytes(), password=None)

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

    keystore_path = directory / "keystore.p12"
    keystore_path.write_bytes(
        pkcs12.serialize_key_and_certificates(
            name=hostname.encode(),
            key=leaf_key,
            cert=leaf_cert,
            cas=[ca_cert],
            encryption_algorithm=serialization.BestAvailableEncryption(KEYSTORE_PASSWORD.encode()),
        )
    )

    return keystore_path
