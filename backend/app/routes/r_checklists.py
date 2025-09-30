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
        
        # Contar por severidad
        severity_stats = {}
        for question in audit_checklist.template.questions:
            response = next((r for r in responses if r.question_id == question.id), None)
            
            if question.severity not in severity_stats:
                severity_stats[question.severity] = {'total': 0, 'yes': 0, 'no': 0, 'na': 0, 'unanswered': 0}
            
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
                'compliance_rate': round((yes_count / answered_questions * 100), 2) if answered_questions > 0 else 0,
                'severity_breakdown': severity_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error getting summary: {str(e)}'}), 500