from django.apps import AppConfig


class DatabaseConfig(AppConfig):
    name = 'database'
    # Keep the historical migration identity so existing databases recognize
    # api.0001_enable_pgvector as applied. This app contains no API code.
    label = 'api'
    verbose_name = 'Database extensions'
