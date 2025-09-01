from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db

assets_bp = Blueprint('assets', __name__)

@assets_bp.route('', methods=['POST'])
@jwt_required()
def create_asset():
    """US-001: Create digital asset"""
    from app.models.asset import Asset
    
    try:
        data = request.get_json()
        
        # Validación de datos obligatorios
        if not data or not data.get('name'):
            return jsonify({'error': 'Asset name is required'}), 400
        
        # Validación de tipo
        asset_type = data.get('type')
        if not asset_type or asset_type not in Asset.get_valid_types():
            return jsonify({
                'error': f'Type must be one of: {", ".join(Asset.get_valid_types())}'
            }), 400
        
        # Crear asset
        asset = Asset(
            name=data.get('name'),
            type=asset_type,
            location=data.get('location', ''),
            status=data.get('status', 'Active'),
            description=data.get('description', ''),
            created_by=int(get_jwt_identity())
        )
        
        db.session.add(asset)
        db.session.commit()
        
        return jsonify({
            'message': 'Asset created successfully',
            'asset': asset.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@assets_bp.route('', methods=['GET'])
@jwt_required()
def list_assets():
    """US-002: Search and filter assets"""
    from app.models.asset import Asset
    
    try:
        # Parámetros de búsqueda
        name = request.args.get('name', '')
        asset_type = request.args.get('type', '')
        status = request.args.get('status', '')
        page = request.args.get('page', 1, type=int)
        per_page = 10
        
        # Query con filtros
        query = Asset.query
        
        if name:
            query = query.filter(Asset.name.ilike(f'%{name}%'))
        if asset_type and asset_type in Asset.get_valid_types():
            query = query.filter(Asset.type == asset_type)
        if status and status in Asset.get_valid_statuses():
            query = query.filter(Asset.status == status)
        
        # Paginación
        assets_paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'assets': [asset.to_dict() for asset in assets_paginated.items],
            'total': assets_paginated.total,
            'pages': assets_paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@assets_bp.route('/<int:asset_id>', methods=['PUT'])
@jwt_required()
def update_asset(asset_id):
    """US-003: Update asset information"""
    from app.models.asset import Asset
    
    try:
        asset = Asset.query.get_or_404(asset_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Data required'}), 400
        
        # Actualizar campos
        if 'name' in data and data['name']:
            asset.name = data['name']
        if 'type' in data and data['type'] in Asset.get_valid_types():
            asset.type = data['type']
        if 'location' in data:
            asset.location = data['location']
        if 'status' in data and data['status'] in Asset.get_valid_statuses():
            asset.status = data['status']
        if 'description' in data:
            asset.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Asset updated successfully',
            'asset': asset.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@assets_bp.route('/<int:asset_id>', methods=['DELETE'])
@jwt_required()
def delete_asset(asset_id):
    """US-003: Delete obsolete asset"""
    from app.models.asset import Asset
    
    try:
        asset = Asset.query.get_or_404(asset_id)
        
        db.session.delete(asset)
        db.session.commit()
        
        return jsonify({'message': 'Asset deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500