from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ai_provider: str = "mock"
    gemini_api_key: str = ""
    groq_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    ai_max_tokens: int = 400
    max_turns_per_session: int = 20
    document_max_tokens: int = 8000

    model_config = {"env_file": ".env"}

settings = Settings()
