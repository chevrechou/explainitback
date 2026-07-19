from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ai_provider: str = "mock"
    groq_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    ai_max_tokens: int = 2000
    max_turns_per_session: int = 10
    document_max_tokens: int = 8000
    sheets_webhook_url: str = ""

    model_config = {"env_file": ".env"}

settings = Settings()
