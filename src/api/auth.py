import os
import json
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from src.yahoo_auth import yahoo_oauth
from config import settings, is_env_configured

router = APIRouter(prefix="/api/auth", tags=["OAuth Authentication"])

class CredentialsPayload(BaseModel):
    client_id: str
    client_secret: str
    redirect_uri: Optional[str] = None

def get_effective_redirect_uri(request: Request) -> str:
    """Detects active URI for custom domains (e.g. https://fantasyfootball.bogosity.org) or configured settings."""
    if settings.YAHOO_REDIRECT_URI and not any(loc in settings.YAHOO_REDIRECT_URI for loc in ["localhost", "127.0.0.1"]):
        return settings.YAHOO_REDIRECT_URI.strip()
        
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    if host and not any(loc in host for loc in ["localhost", "127.0.0.1"]):
        return f"{proto}://{host}/api/auth/callback"
        
    return (settings.YAHOO_REDIRECT_URI or f"{proto}://{host}/api/auth/callback").strip()

@router.get("/status")
def auth_status(request: Request):
    effective_uri = get_effective_redirect_uri(request)
    valid_creds = bool(
        settings.YAHOO_CLIENT_ID 
        and settings.YAHOO_CLIENT_SECRET 
        and "your_yahoo" not in settings.YAHOO_CLIENT_ID
    )
    env_configured = is_env_configured()
    
    return {
        "authenticated": yahoo_oauth.is_authenticated(),
        "has_credentials": valid_creds,
        "env_configured": env_configured,
        "client_id": "" if env_configured else (settings.YAHOO_CLIENT_ID if "your_yahoo" not in settings.YAHOO_CLIENT_ID else ""),
        "redirect_uri": effective_uri
    }

@router.post("/credentials")
def save_credentials(payload: CredentialsPayload, request: Request):
    c_id = payload.client_id.strip()
    c_secret = payload.client_secret.strip()
    
    if not c_id or not c_secret:
        raise HTTPException(status_code=400, detail="Client ID and Client Secret cannot be empty.")
        
    settings.YAHOO_CLIENT_ID = c_id
    settings.YAHOO_CLIENT_SECRET = c_secret
    
    if payload.redirect_uri and payload.redirect_uri.strip():
        settings.YAHOO_REDIRECT_URI = payload.redirect_uri.strip()

    # Save to data/credentials.json for persistence
    try:
        cred_path = os.path.join(os.path.dirname(settings.TOKEN_FILE_PATH), "credentials.json")
        with open(cred_path, "w") as f:
            json.dump({
                "YAHOO_CLIENT_ID": c_id,
                "YAHOO_CLIENT_SECRET": c_secret,
                "YAHOO_REDIRECT_URI": settings.YAHOO_REDIRECT_URI
            }, f, indent=2)
    except Exception as e:
        print(f"Warning saving credentials JSON: {e}")

    return {
        "status": "success",
        "message": "Yahoo API credentials updated successfully.",
        "redirect_uri": get_effective_redirect_uri(request)
    }

@router.get("/login")
def get_login_url(request: Request):
    if not settings.YAHOO_CLIENT_ID or not settings.YAHOO_CLIENT_SECRET or "your_yahoo" in settings.YAHOO_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Yahoo Client ID or Secret is missing or invalid. Please save valid credentials.")
    
    redirect_uri = get_effective_redirect_uri(request)
    auth_url = yahoo_oauth.get_auth_url(redirect_uri=redirect_uri)
    return {"auth_url": auth_url, "redirect_uri": redirect_uri}

from urllib.parse import quote

@router.get("/callback")
def oauth_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    err = error if isinstance(error, str) and error.strip() else None
    err_desc = error_description if isinstance(error_description, str) and error_description.strip() else None
    auth_code = code.strip() if isinstance(code, str) and code.strip() else None

    if err:
        msg = err_desc or err
        return RedirectResponse(url=f"/?auth_error={quote(str(msg))}")
        
    if not auth_code:
        return RedirectResponse(url="/?auth_error=No+authorization+code+received+from+Yahoo")
        
    try:
        redirect_uri = get_effective_redirect_uri(request)
        token_data = yahoo_oauth.get_token_from_code(auth_code, redirect_uri=redirect_uri)
        return RedirectResponse(url="/?auth_success=true")
    except Exception as e:
        return RedirectResponse(url=f"/?auth_error={quote(f'OAuth exchange error: {str(e)}')}")

@router.post("/logout")
def logout():
    yahoo_oauth.clear_tokens()
    return {"status": "success", "message": "Logged out from Yahoo OAuth successfully."}

@router.get("/diagnostic")
def run_diagnostic(league_id: Optional[str] = "1667331"):
    """Probes Yahoo API endpoints with the current token and returns full diagnostic response data."""
    import time
    from src.yahoo_client import yahoo_client

    tokens = yahoo_oauth.load_tokens() or {}
    now = time.time()
    exp = tokens.get("expires_at", 0)
    
    token_status = {
        "token_file_exists": os.path.exists(settings.TOKEN_FILE_PATH),
        "is_authenticated": yahoo_oauth.is_authenticated(),
        "token_type": tokens.get("token_type"),
        "granted_scope": tokens.get("scope"),
        "xoauth_yahoo_guid": tokens.get("xoauth_yahoo_guid"),
        "expires_in_seconds": round(exp - now) if exp else None,
        "is_expired": now >= exp if exp else True,
        "has_refresh_token": bool(tokens.get("refresh_token")),
        "client_id_configured": bool(settings.YAHOO_CLIENT_ID and "your_yahoo" not in settings.YAHOO_CLIENT_ID)
    }

    test_endpoints = [
        "game/nfl",
        "game/449",
        "users;use_login=1/games",
        "users;use_login=1/games;game_keys=449/leagues",
        "users;use_login=1/games;game_keys=nfl/leagues",
        f"league/449.l.{league_id}/settings",
        f"league/nfl.l.{league_id}/settings",
        f"league/423.l.{league_id}/settings"
    ]

    probes = []
    for ep in test_endpoints:
        probe_res = yahoo_client.test_endpoint(ep)
        probes.append(probe_res)

    return {
        "status": "completed",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "token_info": token_status,
        "endpoint_probes": probes
    }


