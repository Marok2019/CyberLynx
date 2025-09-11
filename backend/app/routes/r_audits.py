from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from datetime import datetime

audits_bp = Blueprint('audits', __name__)

@audits_bp.route('', methods=['GET'])
@jwt_required()
def list_audits():
    """US-004: List audits"""
    from app.models.audit import Audit
    
    try:
        # Filtro por estado opcional
        status = request.args.get('status', '')
        
        query = Audit.query
        
        if status and status in Audit.get_valid_statuses():
            query = query.filter(Audit.status == status)
        
        audits = query.order_by(Audit.created_at.desc()).all()
        
        return jsonify({
            'audits': [audit.to_dict() for audit in audits],
            'total': len(audits)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@audits_bp.route('/<int:audit_id>', methods=['PUT'])
@jwt_required()
def update_audit(audit_id):
    """US-004: Update audit status"""
    from app.models.audit import Audit
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Data required'}), 400
        
        # Actualizar campos
        if 'name' in data:
            audit.name = data['name']
        if 'description' in data:
            audit.description = data['description']
        
        # Manejo de estados con timestamps
        if 'status' in data and data['status'] in Audit.get_valid_statuses():
            new_status = data['status']
            
            if new_status == 'In_Progress' and audit.status == 'Created':
                audit.started_at = datetime.utcnow()
            elif new_status == 'Completed' and audit.status == 'In_Progress':
                audit.completed_at = datetime.utcnow()
            
            audit.status = new_status
        
        db.session.commit()
        
        return jsonify({
            'message': 'Audit updated successfully',
            'audit': audit.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@audits_bp.route('', methods=['POST'])
@jwt_required()
def create_audit():
    """US-004: Create basic audit with asset assignment"""
    from app.models.audit import Audit
    from app.models.asset import Asset
    
    try:
        data = request.get_json()
        print(f"🔍 DEBUG - Datos recibidos: {data}")  # Debug temporal
        
        if not data or not data.get('name'):
            return jsonify({'error': 'Audit name is required'}), 400
        
        # Validar y obtener assets
        asset_ids = data.get('asset_ids', [])
        print(f"🔍 DEBUG - Asset IDs recibidos: {asset_ids}")  # Debug temporal
        assets = []
        
        if asset_ids:
            assets = Asset.query.filter(Asset.id.in_(asset_ids)).all()
            found_ids = [asset.id for asset in assets]
            print(f"🔍 DEBUG - Assets encontrados: {found_ids}")  # Debug temporal
            
            if len(assets) != len(asset_ids):
                missing_ids = [aid for aid in asset_ids if aid not in found_ids]
                return jsonify({'error': f'Assets not found: {missing_ids}'}), 400
        
        # Crear auditoría
        audit = Audit(
            name=data.get('name'),
            description=data.get('description', ''),
            status='Created',
            created_by=int(get_jwt_identity())
        )
        
        # CRÍTICO: Asignar assets usando la relación many-to-many
        audit.assets = assets
        print(f"🔍 DEBUG - Assets asignados a auditoría: {len(assets)}")  # Debug temporal
        
        db.session.add(audit)
        db.session.commit()
        
        # Verificar que se guardaron correctamente
        audit_created = Audit.query.get(audit.id)
        print(f"🔍 DEBUG - Assets guardados en BD: {len(audit_created.assets)}")  # Debug temporal
        
        return jsonify({
            'message': 'Audit created successfully',
            'audit': audit.to_dict(),
            'assets_assigned': len(audit.assets)  # Info adicional
        }), 201
        
    except Exception as e:
        print(f"🚨 ERROR creando auditoría: {str(e)}")  # Debug temporal
        db.session.rollback()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@audits_bp.route('/<int:audit_id>/assets', methods=['GET'])
@jwt_required()
def get_audit_assets(audit_id):
    """US-004: Get assets assigned to audit"""
    from app.models.audit import Audit
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        
        return jsonify({
            'audit': audit.to_dict(),
            'assets': [asset.to_dict() for asset in audit.assets],
            'total_assets': len(audit.assets)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500
    
@audits_bp.route('/<int:audit_id>', methods=['DELETE'])
@jwt_required()
def delete_audit(audit_id):
    """Delete audit - SOLUCIÓN PROBLEMA 1"""
    from app.models.audit import Audit
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        
        # Limpiar relaciones antes de eliminar
        audit.assets.clear()
        
        db.session.delete(audit)
        db.session.commit()
        
        return jsonify({
            'message': 'Audit deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting audit: {str(e)}'}), 500