import os
from app import create_app, db
from dotenv import load_dotenv

# Cargar .env
load_dotenv()

# Crear la aplicación
app = create_app(os.getenv('FLASK_CONFIG') or 'development')

# Inicializar BD
@app.cli.command()
def init_db():
    """Crear todas las tablas"""
    db.create_all()
    print('✅ Base de datos inicializada')

# Crear usuario admin por defecto
def create_default_user():
    """Crear usuario administrador por defecto"""
    from app.models.user import User
    
    # Verificar si ya existe el usuario admin
    existing_admin = User.query.filter_by(email='admin@cyberlynx.com').first()
    
    if not existing_admin:
        admin = User(
            nombre='Administrador',
            email='admin@cyberlynx.com',
            rol='admin'
        )
        admin.set_password('admin123')
        
        db.session.add(admin)
        db.session.commit()
        print('admin created!\nCoords: admin@cyberlynx.com / admin123')
    else:
        print('Admin already exists')

if __name__ == '__main__':
    # Crear tablas automáticamente
    with app.app_context():
        db.create_all()
        create_default_user()
        print('Server deployed @ http://127.0.0.1:5000')
    
    app.run(host='127.0.0.1', port=5000, debug=True)