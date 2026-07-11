from fastapi import APIRouter, HTTPException
from app.models.schemas import SignupRequest, AuthResponse
from app.db.supabase import get_supabase

router = APIRouter()


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    try:
        result = get_supabase().auth.sign_up({"email": req.email, "password": req.password})
        return AuthResponse(user_id=result.user.id, access_token=result.session.access_token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/login", response_model=AuthResponse)
async def login(req: SignupRequest):
    try:
        result = get_supabase().auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        return AuthResponse(user_id=result.user.id, access_token=result.session.access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
