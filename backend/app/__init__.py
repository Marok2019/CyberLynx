from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config

db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # Importar TODOS los modelos (nombres actualizados)
    from app.models.user import User
    from app.models.asset import Asset
    from app.models.audit import Audit
    
    # Registrar blueprints (nombres actualizados)
    from app.routes.r_auth import auth_bp
    from app.routes.r_assets import assets_bp
    from app.routes.r_audits import audits_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(assets_bp, url_prefix='/api/assets')
    app.register_blueprint(audits_bp, url_prefix='/api/audits')
    
    return app