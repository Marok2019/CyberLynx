from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.user import User
from app.utils.decorators import admin_required
import re

users_bp = Blueprint('users', __name__)

def is_valid_email(email: str) -> bool:
    return re.fullmatch(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email) is not None

def is_valid_password(pw: str) -> bool:
    return re.fullmatch(r'^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$', pw) is not None

@users_bp.route('/', methods=['GET'])
@jwt_required()
@admin_required()
def list_users():
    active = request.args.get('active')
    query = User.query
    if active is not None:
        if active.lower() == 'true':
            query = query.filter_by(active=True)
        elif active.lower() == 'false':
            query = query.filter_by(active=False)
    users = query.order_by(User.created_at.desc()).all()
    return jsonify({
        'total': len(users),
        'users': [user.to_dict() for user in users]
    }), 200

@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required()
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({'user': user.to_dict()}), 200

@users_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required()
def create_user():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    role = data.get('role') or 'auditor'
    password = data.get('password') or ''
    if not all([name, email, role, password]):
        return jsonify({'error': 'name, email, role, and password are required'}), 400
    if role not in User.get_valid_roles():
        return jsonify({'error': f'Invalid role. Allowed: {User.get_valid_roles()}'}), 400
    if not is_valid_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    if not is_valid_password(password):
        return jsonify({'error': 'Weak password. Min 8 chars, 1 uppercase, 1 number, 1 symbol'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already in use'}), 409
    user = User(name=name, email=email, role=role, active=True)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201

@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required()
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    if 'name' in data and data['name'] is not None:
        user.name = data['name'].strip()
    if 'role' in data and data['role'] is not None:
        if data['role'] not in User.get_valid_roles():
            return jsonify({'error': f'Invalid role. Allowed: {User.get_valid_roles()}'}), 400
        user.role = data['role']
    if 'active' in data and data['active'] is not None:
        user.active = bool(data['active'])
    if 'password' in data and data['password']:
        if not is_valid_password(data['password']):
            return jsonify({'error': 'Weak password. Min 8 chars, 1 uppercase, 1 number, 1 symbol'}), 400
        user.set_password(data['password'])
    db.session.commit()
    return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required()
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully', 'user_id': user_id}), 200