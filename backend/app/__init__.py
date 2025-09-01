from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config

# Instancias globales
db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # Importar modelos
    from app.models.user import User
    from app.models.activos import Activo
    
    # Registrar blueprints (rutas)
    from app.routes.auth import auth_bp
    from app.routes.activos import activos_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(activos_bp, url_prefix='/api/activos')

    return app