import os
from app import create_app, db
from dotenv import load_dotenv

load_dotenv()

app = create_app(os.getenv('FLASK_CONFIG') or 'development')

@app.cli.command()
def init_db():
    db.create_all()
    print('✅ Database initialized')

def create_default_user():
    """Create default admin user"""
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
        print('👤 Admin user created: admin@cyberlynx.com / admin123')
    else:
        print('👤 Admin user already exists')

def seed_checklists():
    """Seed checklist templates"""
    from app.seeds.seed_checklists import seed_checklist_templates
    seed_checklist_templates()

if __name__ == '__main__':
    with app.app_context():
        # 1. Crear todas las tablas
        db.create_all()
        print('✅ Database tables created')
        
        # 2. Crear usuario admin
        create_default_user()
        
        # 3. Cargar templates de checklist (NUEVO)
        try:
            seed_checklists()
        except Exception as e:
            print(f'⚠️  Error seeding checklists: {str(e)}')
        
        print('🚀 Server started at http://127.0.0.1:5000')
    
    app.run(host='127.0.0.1', port=5000, debug=True)