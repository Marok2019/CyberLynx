from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Endpoint de autenticación"""
    from app.models.user import User
    
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email, active=True).first()
        
        if user and user.check_password(password):
            # ← CAMBIO CRÍTICO: Convertir a string
            access_token = create_access_token(identity=str(user.id))
            
            return jsonify({
                'access_token': access_token,
                'user': user.to_dict(),
                'message': 'Login successful'
            }), 200
        
        return jsonify({'error': 'Credenciales inválidas'}), 401
        
    except Exception as e:
        print(f"🚨 Login error: {str(e)}")  # Debug temporal
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Obtener perfil del usuario autenticado"""
    from app.models.user import User
    
    try:
        user_id_str = get_jwt_identity()  # Esto es string
        user_id = int(user_id_str)       # Convertir a int para la BD
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        print(f"🚨 Profile error: {str(e)}")  # Debug temporal
        return jsonify({'error': 'Internal server error'}), 500