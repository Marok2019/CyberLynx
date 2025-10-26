from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from datetime import datetime

checklists_bp = Blueprint('checklists', __name__)

@checklists_bp.route('/templates', methods=['GET'])
@jwt_required()
def list_templates():
    """US-005: Listar plantillas de checklist disponibles"""
    from app.models.checklist import ChecklistTemplate
    
    try:
        category = request.args.get('category', '')
        
        query = ChecklistTemplate.query.filter_by(active=True)
        
        if category and category in ChecklistTemplate.get_valid_categories():
            query = query.filter_by(category=category)
        
        templates = query.order_by(ChecklistTemplate.name).all()
        
        return jsonify({
            'templates': [template.to_dict() for template in templates],
            'total': len(templates)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error listing templates: {str(e)}'}), 500


@checklists_bp.route('/templates/<int:template_id>', methods=['GET'])
@jwt_required()
def get_template_details(template_id):
    """US-005: Obtener detalles de una plantilla con sus preguntas"""
    from app.models.checklist import ChecklistTemplate
    
    try:
        template = ChecklistTemplate.query.get_or_404(template_id)
        
        questions = template.questions.order_by('order').all()
        
        return jsonify({
            'template': template.to_dict(),
            'questions': [q.to_dict() for q in questions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error getting template: {str(e)}'}), 500


@checklists_bp.route('/<int:checklist_id>/summary', methods=['GET'])
@jwt_required()
def get_checklist_summary(checklist_id):
    """US-005: Obtener resumen estadístico del checklist"""
    from app.models.checklist import AuditChecklist, ChecklistResponse
    
    try:
        audit_checklist = AuditChecklist.query.get_or_404(checklist_id)
        
        # Obtener todas las respuestas
        responses = audit_checklist.responses.all()
        
        # Calcular estadísticas
        total_questions = audit_checklist.template.questions.count()
        answered_questions = len(responses)
        
        yes_count = sum(1 for r in responses if r.answer == 'Yes')
        no_count = sum(1 for r in responses if r.answer == 'No')
        na_count = sum(1 for r in responses if r.answer == 'N/A')
        
        # Solo considerar Sí/No para cumplimiento
        preguntas_aplicables = yes_count + no_count
        
        # Contar por severidad
        severity_stats = {}
        for question in audit_checklist.template.questions:
            response = next((r for r in responses if r.question_id == question.id), None)
            
            if question.severity not in severity_stats:
                severity_stats[question.severity] = {
                    'total': 0, 
                    'yes': 0, 
                    'no': 0, 
                    'na': 0, 
                    'unanswered': 0
                }
            
            severity_stats[question.severity]['total'] += 1
            
            if response:
                if response.answer == 'Yes':
                    severity_stats[question.severity]['yes'] += 1
                elif response.answer == 'No':
                    severity_stats[question.severity]['no'] += 1
                elif response.answer == 'N/A':
                    severity_stats[question.severity]['na'] += 1
            else:
                severity_stats[question.severity]['unanswered'] += 1
        
        return jsonify({
            'checklist': audit_checklist.to_dict(),
            'summary': {
                'total_questions': total_questions,
                'answered_questions': answered_questions,
                'unanswered_questions': total_questions - answered_questions,
                'yes_count': yes_count,
                'no_count': no_count,
                'na_count': na_count,
                'preguntas_aplicables': preguntas_aplicables,
                'compliance_rate': round((yes_count / preguntas_aplicables * 100), 2) if preguntas_aplicables > 0 else 0,
                'severity_breakdown': severity_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error obteniendo resumen: {str(e)}'}), 500


# ✅ NUEVO ENDPOINT: Validar y completar checklist
@checklists_bp.route('/audit-checklists/<int:checklist_id>/complete', methods=['POST'])
@jwt_required()
def complete_checklist(checklist_id):
    """
    US-005: Marcar checklist como completado
    Valida que todas las preguntas estén respondidas antes de finalizar
    """
    from app.models.checklist import AuditChecklist
    
    try:
        audit_checklist = AuditChecklist.query.get_or_404(checklist_id)
        
        # Validar que todas las preguntas tengan respuesta
        total_questions = audit_checklist.template.questions.count()
        answered_questions = audit_checklist.responses.count()
        
        if answered_questions < total_questions:
            unanswered_count = total_questions - answered_questions
            return jsonify({
                'error': f'Checklist incompleto. Complete todas las preguntas para finalizar auditoría. Faltan {unanswered_count} preguntas por responder.',
                'total_questions': total_questions,
                'answered_questions': answered_questions,
                'unanswered_count': unanswered_count
            }), 400
        
        # Marcar como completado
        audit_checklist.status = 'Completed'
        audit_checklist.completed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Checklist completado exitosamente',
            'checklist': audit_checklist.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error completing checklist: {str(e)}'}), 500

    
@checklists_bp.route('/audits/<int:audit_id>/checklists/<int:checklist_id>', methods=['DELETE'])
@jwt_required()
def delete_checklist_from_audit(audit_id, checklist_id):
    """Eliminar un checklist de una auditoría"""
    from app.models.checklist import AuditChecklist
    from app.models.audit import Audit
    from app.models.user import User
    
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Verificar auditoría
        audit = Audit.query.get_or_404(audit_id)
        
        # Verificar checklist
        audit_checklist = AuditChecklist.query.filter_by(
            id=checklist_id,
            audit_id=audit_id
        ).first_or_404()
        
        # Validar permisos (solo admin o creador de la auditoría)
        if user.role != 'admin' and audit.created_by != user_id:
            return jsonify({'error': 'Unauthorized to delete this checklist'}), 403
        
        # Datos para el mensaje de confirmación
        template_name = audit_checklist.template.name
        responses_count = audit_checklist.responses.count()
        is_completed = audit_checklist.status == 'Completed'
        
        # Si está completado, requerir confirmación explícita
        if is_completed:
            confirm = request.args.get('confirm', 'false').lower()
            if confirm != 'true':
                return jsonify({
                    'warning': 'This checklist is completed with saved responses',
                    'template_name': template_name,
                    'responses_count': responses_count,
                    'status': 'Completed',
                    'message': 'Add ?confirm=true to proceed with deletion'
                }), 400
        
        # Eliminar (cascade eliminará automáticamente las respuestas)
        db.session.delete(audit_checklist)
        db.session.commit()
        
        return jsonify({
            'message': f'Checklist "{template_name}" deleted successfully',
            'deleted_responses': responses_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting checklist: {str(e)}'}), 500