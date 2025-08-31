from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user import User

# Blueprint para rutas de autenticación
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    US-009: Autenticarse de forma segura
    POST /api/auth/login
    """
    try:
        # Getter
        data = request.get_json()
        
        # Basic check
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({
                'error': 'Email y contraseña requeridos'
            }), 400
        
        email = data.get('email')
        password = data.get('password')
        
        # Active user lookup
        user = User.query.filter_by(email=email, activo=True).first()
        
        # Login auth
        if user and user.check_password(password):
            # Create JWT
            access_token = create_access_token(identity=user.id)
            
            return jsonify({
                'access_token': access_token,
                'user': user.to_dict(),
                'message': 'Login exitoso'
            }), 200
        
        # Invalid credentials
        return jsonify({
            'error': 'Credenciales inválidas'
        }), 401
        
    except Exception as e:
        return jsonify({
            'error': f'Error interno del servidor'
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Obtener perfil del usuario autenticado
    GET /api/auth/profile
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
        return jsonify({
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor'
        }), 500