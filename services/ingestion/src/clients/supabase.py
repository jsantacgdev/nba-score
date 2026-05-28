from supabase import Client, create_client

from src.config import config


def get_supabase_client() -> Client:
    return create_client(
        config.SUPABASE_URL,
        config.SUPABASE_SERVICE_ROLE_KEY,
    )