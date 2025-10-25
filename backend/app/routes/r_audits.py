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
    """US-004: Update audit with assets assignment"""
    from app.models.audit import Audit
    from app.models.asset import Asset
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        data = request.get_json()
        print(f"🔍 DEBUG - Actualizando auditoría {audit_id} con datos: {data}")  # Debug temporal
        
        if not data:
            return jsonify({'error': 'Data required'}), 400
        
        # Actualizar campos
        if 'name' in data:
            audit.name = data['name']
        if 'description' in data:
            audit.description = data['description']
        
        # CRÍTICO: Actualizar activos asignados
        if 'asset_ids' in data:
            asset_ids = data['asset_ids']
            print(f"🔍 DEBUG - Nuevos asset IDs: {asset_ids}")  # Debug temporal
            
            # Obtener los activos válidos
            if asset_ids:
                assets = Asset.query.filter(Asset.id.in_(asset_ids)).all()
                found_ids = [asset.id for asset in assets]
                print(f"🔍 DEBUG - Assets encontrados: {found_ids}")  # Debug temporal
                
                if len(assets) != len(asset_ids):
                    missing_ids = [aid for aid in asset_ids if aid not in found_ids]
                    return jsonify({'error': f'Assets not found: {missing_ids}'}), 400
                
                # Reemplazar todos los activos asignados
                audit.assets = assets
                print(f"🔍 DEBUG - Assets asignados: {len(audit.assets)}")  # Debug temporal
            else:
                # Si no hay asset_ids, limpiar todas las asignaciones
                audit.assets = []
                print("🔍 DEBUG - Limpiando todas las asignaciones de assets")  # Debug temporal
        
        # Manejo de estados con timestamps
        if 'status' in data and data['status'] in Audit.get_valid_statuses():
            new_status = data['status']
            
            if new_status == 'In_Progress' and audit.status == 'Created':
                audit.started_at = datetime.utcnow()
            elif new_status == 'Completed' and audit.status == 'In_Progress':
                audit.completed_at = datetime.utcnow()
            
            audit.status = new_status
        
        db.session.commit()
        
        # Verificar que se guardaron correctamente
        updated_audit = Audit.query.get(audit.id)
        print(f"🔍 DEBUG - Assets guardados en BD después de actualizar: {len(updated_audit.assets)}")  # Debug temporal
        
        return jsonify({
            'message': 'Audit updated successfully',
            'audit': updated_audit.to_dict(),
            'assets_assigned': len(updated_audit.assets)  # Info adicional
        }), 200
        
    except Exception as e:
        print(f"🚨 ERROR actualizando auditoría: {str(e)}")  # Debug temporal
        db.session.rollback()

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
    
    # ========== CHECKLIST ENDPOINTS (US-005) ==========

@audits_bp.route('/<int:audit_id>/checklist/start', methods=['POST'])
@jwt_required()
def start_audit_checklist(audit_id):
    """US-005: Iniciar checklist en una auditoría"""
    from app.models.audit import Audit
    from app.models.checklist import ChecklistTemplate, AuditChecklist
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        data = request.get_json()
        
        if not data or not data.get('template_id'):
            return jsonify({'error': 'template_id is required'}), 400
        
        template_id = data.get('template_id')
        template = ChecklistTemplate.query.get_or_404(template_id)
        
        # Verificar si ya existe un checklist activo para este template
        existing = AuditChecklist.query.filter_by(
            audit_id=audit_id,
            template_id=template_id,
            status='In_Progress'
        ).first()
        
        if existing:
            return jsonify({'error': 'Checklist already in progress for this template'}), 400
        
        # Crear nueva instancia de checklist
        audit_checklist = AuditChecklist(
            audit_id=audit_id,
            template_id=template_id,
            status='In_Progress'
        )

        db.session.add(audit_checklist)
        db.session.commit()

        # Actualizar estado de la auditoría automáticamente
        audit.update_status_based_on_checklists()
        db.session.commit()

        return jsonify({
            'message': 'Checklist started successfully',
            'checklist': audit_checklist.to_dict(),
            'audit_status': audit.status
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error starting checklist: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>/checklist/<int:checklist_id>/answer', methods=['POST'])
@jwt_required()
def answer_checklist_question(audit_id, checklist_id):
    """US-005: Responder pregunta del checklist"""
    from app.models.checklist import AuditChecklist, ChecklistResponse, ChecklistQuestion
    
    try:
        audit_checklist = AuditChecklist.query.get_or_404(checklist_id)
        
        if audit_checklist.audit_id != audit_id:
            return jsonify({'error': 'Checklist does not belong to this audit'}), 400
        
        if audit_checklist.status == 'Completed':
            return jsonify({'error': 'Checklist already completed'}), 400
        
        data = request.get_json()
        
        if not data or not data.get('question_id') or not data.get('answer'):
            return jsonify({'error': 'question_id and answer are required'}), 400
        
        question_id = data.get('question_id')
        answer = data.get('answer')
        notes = data.get('notes', '')
        
        # Validar respuesta
        if answer not in ChecklistResponse.get_valid_answers():
            return jsonify({'error': f'Answer must be one of: {", ".join(ChecklistResponse.get_valid_answers())}'}), 400
        
        # Verificar que la pregunta pertenece al template
        question = ChecklistQuestion.query.get_or_404(question_id)
        if question.template_id != audit_checklist.template_id:
            return jsonify({'error': 'Question does not belong to this checklist template'}), 400
        
        # Verificar si ya existe respuesta
        existing_response = ChecklistResponse.query.filter_by(
            audit_checklist_id=checklist_id,
            question_id=question_id
        ).first()
        
        if existing_response:
            # Actualizar respuesta existente
            existing_response.answer = answer
            existing_response.notes = notes
            existing_response.answered_at = datetime.utcnow()
            existing_response.answered_by = int(get_jwt_identity())
        else:
            # Crear nueva respuesta
            response = ChecklistResponse(
                audit_checklist_id=checklist_id,
                question_id=question_id,
                answer=answer,
                notes=notes,
                answered_by=int(get_jwt_identity())
            )
            db.session.add(response)
        
        db.session.commit()
        
        # Verificar si se completó el checklist
        total_questions = audit_checklist.template.questions.count()
        answered_questions = audit_checklist.responses.count()

        if answered_questions >= total_questions and audit_checklist.status == 'In_Progress':
            audit_checklist.status = 'Completed'
            audit_checklist.completed_at = datetime.utcnow()
            db.session.commit()

            # Actualizar estado de la auditoría automáticamente
            from app.models.audit import Audit
            audit = Audit.query.get(audit_id)
            audit.update_status_based_on_checklists()
            db.session.commit()

        return jsonify({
            'message': 'Answer saved successfully',
            'checklist': audit_checklist.to_dict(),
            'audit_status': audit_checklist.audit.status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error saving answer: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>/checklist/<int:checklist_id>', methods=['GET'])
@jwt_required()
def get_audit_checklist(audit_id, checklist_id):
    """US-005: Obtener checklist completo con respuestas"""
    from app.models.checklist import AuditChecklist
    
    try:
        audit_checklist = AuditChecklist.query.get_or_404(checklist_id)
        
        if audit_checklist.audit_id != audit_id:
            return jsonify({'error': 'Checklist does not belong to this audit'}), 400
        
        # Obtener todas las preguntas con sus respuestas
        questions = audit_checklist.template.questions.order_by('order').all()
        
        questions_with_responses = []
        for question in questions:
            response = audit_checklist.responses.filter_by(question_id=question.id).first()
            
            questions_with_responses.append({
                'question': question.to_dict(),
                'response': response.to_dict() if response else None
            })
        
        return jsonify({
            'checklist': audit_checklist.to_dict(),
            'template': audit_checklist.template.to_dict(),
            'questions_with_responses': questions_with_responses
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error getting checklist: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>/checklists', methods=['GET'])
@jwt_required()
def list_audit_checklists(audit_id):
    """US-005: Listar todos los checklists de una auditoría"""
    from app.models.audit import Audit
    from app.models.checklist import AuditChecklist
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        
        checklists = AuditChecklist.query.filter_by(audit_id=audit_id).order_by(AuditChecklist.started_at.desc()).all()
        
        return jsonify({
            'audit': audit.to_dict(),
            'checklists': [checklist.to_dict() for checklist in checklists],
            'total': len(checklists)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error listing checklists: {str(e)}'}), 500
    
    