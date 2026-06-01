import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SUPABASE_URL: str = os.environ["SUPABASE_URL"]
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    BALLDONTLIE_API_KEY: str = os.environ.get("BALLDONTLIE_API_KEY", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


config = Config()