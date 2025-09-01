import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-2024'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///cyberlynx.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-2024'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # CONFIGURACIONES CSRF COMPLETAS
    JWT_CSRF_CHECK_FORM = False
    JWT_CSRF_IN_COOKIES = False
    JWT_ACCESS_CSRF_HEADER_NAME = None
    JWT_REFRESH_CSRF_HEADER_NAME = None

class DevelopmentConfig(Config):
    DEBUG = True
    # ASEGURAR CSRF DESACTIVADO EN DESARROLLO
    JWT_CSRF_CHECK_FORM = False
    JWT_CSRF_IN_COOKIES = False

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}