from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
# NO importar Activo aquí ↑

activos_bp = Blueprint('activos', __name__)

@activos_bp.route('', methods=['POST'])
@jwt_required()
def crear_activo():
    """US-001: Registrar activos digitales básicos"""
    # Importación tardía dentro de la función
    from app.models.activo import Activo
    
    try:
        data = request.get_json()
        
        # Validación de datos obligatorios
        if not data or not data.get('nombre'):
            return jsonify({'error': 'Nombre es obligatorio'}), 400
        
        # Validación de tipo
        tipo = data.get('tipo')
        if not tipo or tipo not in Activo.get_tipos_validos():
            return jsonify({
                'error': f'Tipo debe ser uno de: {", ".join(Activo.get_tipos_validos())}'
            }), 400
        
        # Crear activo
        activo = Activo(
            nombre=data.get('nombre'),
            tipo=tipo,
            ubicacion=data.get('ubicacion', ''),
            estado=data.get('estado', 'Activo'),
            descripcion=data.get('descripcion', ''),
            creado_por=get_jwt_identity()
        )
        
        db.session.add(activo)
        db.session.commit()
        
        return jsonify({
            'message': 'Activo creado exitosamente',
            'activo': activo.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@activos_bp.route('', methods=['GET'])
@jwt_required()
def listar_activos():
    """US-002: Buscar y filtrar activos"""
    # Importación tardía
    from app.models.activo import Activo
    
    try:
        # Parámetros de búsqueda
        nombre = request.args.get('nombre', '')
        tipo = request.args.get('tipo', '')
        estado = request.args.get('estado', '')
        page = request.args.get('page', 1, type=int)
        per_page = 10
        
        # Query con filtros
        query = Activo.query
        
        if nombre:
            query = query.filter(Activo.nombre.ilike(f'%{nombre}%'))
        if tipo and tipo in Activo.get_tipos_validos():
            query = query.filter(Activo.tipo == tipo)
        if estado and estado in Activo.get_estados_validos():
            query = query.filter(Activo.estado == estado)
        
        # Paginación
        activos_paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'activos': [activo.to_dict() for activo in activos_paginated.items],
            'total': activos_paginated.total,
            'pages': activos_paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@activos_bp.route('/<int:activo_id>', methods=['PUT'])
@jwt_required()
def modificar_activo(activo_id):
    """US-003: Modificar información de activos"""
    # Importación tardía
    from app.models.activo import Activo
    
    try:
        activo = Activo.query.get_or_404(activo_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Datos requeridos'}), 400
        
        # Actualizar campos
        if 'nombre' in data and data['nombre']:
            activo.nombre = data['nombre']
        if 'tipo' in data and data['tipo'] in Activo.get_tipos_validos():
            activo.tipo = data['tipo']
        if 'ubicacion' in data:
            activo.ubicacion = data['ubicacion']
        if 'estado' in data and data['estado'] in Activo.get_estados_validos():
            activo.estado = data['estado']
        if 'descripcion' in data:
            activo.descripcion = data['descripcion']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Activo modificado exitosamente',
            'activo': activo.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@activos_bp.route('/<int:activo_id>', methods=['DELETE'])
@jwt_required()
def eliminar_activo(activo_id):
    """US-003: Eliminar activos obsoletos"""
    # Importación tardía
    from app.models.activo import Activo
    
    try:
        activo = Activo.query.get_or_404(activo_id)
        
        db.session.delete(activo)
        db.session.commit()
        
        return jsonify({
            'message': 'Activo eliminado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
    
