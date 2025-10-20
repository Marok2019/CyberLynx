from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models.user import User

def admin_required():
    """
    Decorador personalizado que verifica si el usuario autenticado tiene el rol 'admin'.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                # Obtener la identidad del usuario desde el token JWT
                user_id_str = get_jwt_identity()
                user_id = int(user_id_str)
                
                # Buscar el usuario en la base de datos
                current_user = User.query.get(user_id)
                
                # Verificar si el usuario existe y tiene el rol 'admin'
                if current_user and current_user.role == 'admin':
                    return fn(*args, **kwargs)
                else:
                    return jsonify({'error': 'Admin access required'}), 403
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid user identity in token'}), 401
        return decorator
    return wrapper