from pathlib import Path
from collections.abc import Iterator
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from starlette.datastructures import Headers
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.routes import auth
from app.core import security
from app.core.config import BACKEND_ENV_FILE, Settings
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from test_support import db_session


TEST_DATABASE_URL = "sqlite+pysqlite:///:memory:"
TEST_SECRET_KEY = "test-only-cors-signing-key-not-a-real-secret"
TEST_SETTINGS = SimpleNamespace(
    secret_key=TEST_SECRET_KEY,
    access_token_expire_minutes=15,
)
LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.0.3:5173",
]


def _settings(**values: str) -> Settings:
    settings_values = {
        "_env_file": None,
        "DATABASE_URL": TEST_DATABASE_URL,
        "SECRET_KEY": TEST_SECRET_KEY,
    }
    settings_values.update(values)
    return Settings(**settings_values)


def test_backend_env_file_path_is_absolute_and_independent_of_working_directory():
    assert BACKEND_ENV_FILE.is_absolute()
    assert BACKEND_ENV_FILE == Path(__file__).resolve().parents[1] / ".env"
    assert Settings.model_config["env_file"] == BACKEND_ENV_FILE


def test_local_cors_origins_are_explicit_settings_defaults():
    settings = _settings()

    assert settings.cors_origins == LOCAL_FRONTEND_ORIGINS


def test_environment_cors_setting_overrides_local_defaults(monkeypatch: pytest.MonkeyPatch):
    deployment_origin = "https://grievances.example.org"
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", deployment_origin)

    settings = _settings()

    assert settings.cors_origins == [deployment_origin]


@pytest.mark.parametrize(
    "origin",
    [*LOCAL_FRONTEND_ORIGINS, "http://unrelated.example:5173"],
)
def test_cors_preflight_allows_only_configured_frontend_origins(origin: str):
    settings = _settings(
        BACKEND_CORS_ORIGINS=",".join(LOCAL_FRONTEND_ORIGINS),
    )
    middleware = CORSMiddleware(
        app=lambda scope, receive, send: None,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    request_headers = Headers(
        {
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
    )

    response = middleware.preflight_response(request_headers)

    if origin in LOCAL_FRONTEND_ORIGINS:
        assert response.status_code == 200
        assert response.headers["Access-Control-Allow-Origin"] == origin
    else:
        assert response.status_code == 400
        assert "Access-Control-Allow-Origin" not in response.headers


@pytest.mark.anyio
async def test_login_route_returns_expected_status_and_cors_headers(db_session: Session):
    password = "isolated-login-test-password"
    user = User(
        name="Login Test Student",
        email="cors.login.student@example.com",
        password_hash=security.hash_password(password),
        role=UserRole.student,
    )
    db_session.add(user)
    db_session.flush()

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=LOCAL_FRONTEND_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.include_router(auth.router, prefix="/api/auth")

    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with patch.object(security, "get_settings", return_value=TEST_SETTINGS):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            invalid_login = await client.post(
                "/api/auth/login",
                headers={"Origin": "http://192.168.0.3:5173"},
                json={"email": user.email, "password": "incorrect-test-password"},
            )
            valid_login = await client.post(
                "/api/auth/login",
                headers={"Origin": "http://192.168.0.3:5173"},
                json={"email": user.email, "password": password},
            )

    assert invalid_login.status_code == 401
    assert invalid_login.headers["Access-Control-Allow-Origin"] == "http://192.168.0.3:5173"
    assert valid_login.status_code == 200
    assert valid_login.headers["Access-Control-Allow-Origin"] == "http://192.168.0.3:5173"
    assert valid_login.json()["user"]["id"] == user.id
