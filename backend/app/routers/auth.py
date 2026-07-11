from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.models.schemas import SignupRequest, AuthResponse
from app.db.supabase import get_supabase

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup(request: Request, req: SignupRequest):
    try:
        result = get_supabase().auth.sign_up({"email": req.email, "password": req.password})
        return AuthResponse(user_id=result.user.id, access_token=result.session.access_token)
    except Exception:
        raise HTTPException(status_code=400, detail="Signup failed")


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, req: SignupRequest):
    try:
        result = get_supabase().auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        return AuthResponse(user_id=result.user.id, access_token=result.session.access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
