import os
from datetime import timedelta

class Config:
    # Clave secreta para Flask (sesiones, cookies)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-2024'
    
    # Conexión a base de datos SQLite
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///cyberlynx.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Evita warnings
    
    # JWT configuración
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-2024'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # Token válido por 24 horas

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

# Diccionario de configuraciones
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}