from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config

db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # ⚠️ IMPORTAR TODOS LOS MODELOS AQUÍ (ANTES DE REGISTRAR BLUEPRINTS)
    with app.app_context():
        from app.models import user, asset, audit, checklist  # ← AÑADIR checklist
    
    # Registrar blueprints
    from app.routes.r_auth import auth_bp
    from app.routes.r_assets import assets_bp
    from app.routes.r_audits import audits_bp
    from app.routes.r_checklists import checklists_bp
    from app.routes.r_reports import reports_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(assets_bp, url_prefix='/api/assets')
    app.register_blueprint(audits_bp, url_prefix='/api/audits')
    app.register_blueprint(checklists_bp, url_prefix='/api/checklists')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    return app