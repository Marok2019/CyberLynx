import os
from app import create_app, db
from dotenv import load_dotenv
from werkzeug.serving import is_running_from_reloader

load_dotenv()

app = create_app(os.getenv('FLASK_CONFIG') or 'development')

@app.cli.command()
def init_db():
    db.create_all()
    print('✅ BBDD inicializada')

def create_default_user():
    """Crear usuario admin por defecto"""
    from app.models.user import User
    
    existing_admin = User.query.filter_by(email='admin@cyberlynx.com').first()
    
    if not existing_admin:
        admin = User(
            name='Administrator',
            email='admin@cyberlynx.com',
            role='admin'
        )
        admin.set_password('admin123')
        
        db.session.add(admin)
        db.session.commit()
        print('👤 Usuario admin creado: admin@cyberlynx.com / admin123')
    else:
        print('👤 Usuario admin ya existe')

def seed_checklists():
    """Sembrar plantillas de checklist"""
    from app.seeds.seed_checklists import seed_checklist_templates
    seed_checklist_templates()

if __name__ == '__main__':
    # Solo ejecutar la inicialización si NO es el proceso de recarga
    if not is_running_from_reloader():
        with app.app_context():
            # 1. Crear todas las tablas
            db.create_all()
            print('✅ Database tables created')
            
            # 2. Crear usuario admin
            create_default_user()
            
            # 3. Cargar templates de checklist
            try:
                seed_checklists()
            except Exception as e:
                print(f'⚠️  Error seeding checklists: {str(e)}')
            
            print('🚀 Servidor inicializado en: http://127.0.0.1:5000')
    
    app.run(host='127.0.0.1', port=5000, debug=True)