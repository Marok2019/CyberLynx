from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from datetime import datetime

audits_bp = Blueprint('audits', __name__)

# ========== CRUD DE AUDITORÍAS (US-004) ==========

@audits_bp.route('', methods=['GET'])
@jwt_required()
def list_audits():
    """US-004: Listar auditorías con filtro opcional por estado"""
    from app.models.audit import Audit
    
    try:
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


@audits_bp.route('', methods=['POST'])
@jwt_required()
def create_audit():
    """US-004: Crear auditoría con asignación de activos"""
    from app.models.audit import Audit
    from app.models.asset import Asset
    
    try:
        data = request.get_json()
        
        if not data or not data.get('name'):
            return jsonify({'error': 'Audit name is required'}), 400
        
        asset_ids = data.get('asset_ids', [])
        assets = []
        
        if asset_ids:
            assets = Asset.query.filter(Asset.id.in_(asset_ids)).all()
            found_ids = [asset.id for asset in assets]
            
            if len(assets) != len(asset_ids):
                missing_ids = [aid for aid in asset_ids if aid not in found_ids]
                return jsonify({'error': f'Assets not found: {missing_ids}'}), 400
        
        audit = Audit(
            name=data.get('name'),
            description=data.get('description', ''),
            status='Created',
            created_by=int(get_jwt_identity())
        )
        
        audit.assets = assets
        
        db.session.add(audit)
        db.session.commit()
        
        return jsonify({
            'message': 'Audit created successfully',
            'audit': audit.to_dict(),
            'assets_assigned': len(audit.assets)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>', methods=['GET'])
@jwt_required()
def get_audit(audit_id):
    """Obtener detalles de una auditoría específica"""
    from app.models.audit import Audit
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        
        return jsonify({
            'audit': audit.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@audits_bp.route('/<int:audit_id>', methods=['PUT'])
@jwt_required()
def update_audit(audit_id):
    """US-004: Actualizar auditoría"""
    from app.models.audit import Audit
    from app.models.asset import Asset
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Data required'}), 400
        
        if 'name' in data:
            audit.name = data['name']
        if 'description' in data:
            audit.description = data['description']
        
        if 'asset_ids' in data:
            asset_ids = data['asset_ids']
            
            if asset_ids:
                assets = Asset.query.filter(Asset.id.in_(asset_ids)).all()
                found_ids = [asset.id for asset in assets]
                
                if len(assets) != len(asset_ids):
                    missing_ids = [aid for aid in asset_ids if aid not in found_ids]
                    return jsonify({'error': f'Assets not found: {missing_ids}'}), 400
                
                audit.assets = assets
            else:
                audit.assets = []
        
        # ⚠️ NOTA: NO permitir cambio manual de estado (se maneja automáticamente)
        # El estado se actualiza solo mediante update_status_based_on_checklists()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Audit updated successfully',
            'audit': audit.to_dict(),
            'assets_assigned': len(audit.assets)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>', methods=['DELETE'])
@jwt_required()
def delete_audit(audit_id):
    """US-004: Eliminar auditoría y sus checklists asociados"""
    from app.models.audit import Audit
    from app.models.checklist import AuditChecklist
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        
        # Eliminar checklists asociados (cascade debería hacerlo automáticamente)
        checklists = AuditChecklist.query.filter_by(audit_id=audit_id).all()
        for checklist in checklists:
            db.session.delete(checklist)
        db.session.flush()

        # Limpiar relaciones de activos
        audit.assets.clear()
        
        # Eliminar auditoría
        db.session.delete(audit)
        db.session.commit()

        return jsonify({
            'message': 'Audit deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting audit: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>/assets', methods=['GET'])
@jwt_required()
def get_audit_assets(audit_id):
    """US-004: Obtener activos asignados a una auditoría"""
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


# ========== GESTIÓN DE CHECKLISTS (US-005) ==========

@audits_bp.route('/<int:audit_id>/checklist/start', methods=['POST'])
@jwt_required()
def start_audit_checklist(audit_id):
    """US-005: Iniciar un nuevo checklist en una auditoría"""
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
            return jsonify({'error': 'Ya existe un checklist en progreso para este template'}), 400
        
        # Crear nueva instancia de checklist
        audit_checklist = AuditChecklist(
            audit_id=audit_id,
            template_id=template_id,
            status='In_Progress'
        )

        db.session.add(audit_checklist)
        db.session.commit()

        # ✅ CRÍTICO: Actualizar estado de auditoría (Created → In_Progress)
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
    """US-005: Guardar respuesta a una pregunta del checklist"""
    from app.models.checklist import AuditChecklist, ChecklistResponse, ChecklistQuestion
    from app.models.audit import Audit
    
    try:
        audit_checklist = AuditChecklist.query.get_or_404(checklist_id)
        
        if audit_checklist.audit_id != audit_id:
            return jsonify({'error': 'Checklist does not belong to this audit'}), 400
        
        if audit_checklist.status == 'Completed':
            return jsonify({'error': 'Checklist already completed'}), 400
        
        data = request.get_json()
        
        if not data or not data.get('question_id') or not data.get('answer'):
            return jsonify({'error': 'question_id and answer required'}), 400
        
        question_id = data.get('question_id')
        answer = data.get('answer')
        notes = data.get('notes', '')
        
        if answer not in ChecklistResponse.get_valid_answers():
            return jsonify({'error': f'Invalid answer'}), 400
        
        question = ChecklistQuestion.query.get_or_404(question_id)
        if question.template_id != audit_checklist.template_id:
            return jsonify({'error': 'Question does not belong to this template'}), 400
        
        # Verificar si ya existe respuesta (actualizar) o crear nueva
        existing_response = ChecklistResponse.query.filter_by(
            audit_checklist_id=checklist_id,
            question_id=question_id
        ).first()
        
        if existing_response:
            existing_response.answer = answer
            existing_response.notes = notes
            existing_response.answered_at = datetime.utcnow()
            existing_response.answered_by = int(get_jwt_identity())
        else:
            response = ChecklistResponse(
                audit_checklist_id=checklist_id,
                question_id=question_id,
                answer=answer,
                notes=notes,
                answered_by=int(get_jwt_identity())
            )
            db.session.add(response)
        
        db.session.commit()
        
        # Verificar si el checklist se completó automáticamente
        total_questions = audit_checklist.template.questions.count()
        answered_questions = audit_checklist.responses.count()

        if answered_questions >= total_questions and audit_checklist.status == 'In_Progress':
            audit_checklist.status = 'Completed'
            audit_checklist.completed_at = datetime.utcnow()
            db.session.commit()

            # ✅ CRÍTICO: Actualizar estado de auditoría (puede pasar a Completed)
            audit = Audit.query.get(audit_id)
            audit.update_status_based_on_checklists()
            db.session.commit()

        # Obtener el estado actualizado de la auditoría
        current_audit = Audit.query.get(audit_id)

        return jsonify({
            'message': 'Answer saved successfully',
            'checklist': audit_checklist.to_dict(),
            'audit_status': current_audit.status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error saving answer: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>/checklist/<int:checklist_id>', methods=['GET'])
@jwt_required()
def get_audit_checklist(audit_id, checklist_id):
    """US-005: Obtener checklist completo con preguntas y respuestas"""
    from app.models.checklist import AuditChecklist
    
    try:
        audit_checklist = AuditChecklist.query.get_or_404(checklist_id)
        
        if audit_checklist.audit_id != audit_id:
            return jsonify({'error': 'Checklist does not belong to this audit'}), 400
        
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
        checklists = AuditChecklist.query.filter_by(audit_id=audit_id)\
            .order_by(AuditChecklist.started_at.desc()).all()
        
        return jsonify({
            'audit': audit.to_dict(),
            'checklists': [checklist.to_dict() for checklist in checklists],
            'total': len(checklists)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error listing checklists: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>/checklists/<int:checklist_id>', methods=['DELETE'])
@jwt_required()
def delete_checklist_from_audit(audit_id, checklist_id):
    """
    Eliminar un checklist de una auditoría
    Si está completado, requiere parámetro ?confirm=true
    """
    from app.models.checklist import AuditChecklist
    from app.models.audit import Audit
    from app.models.user import User
    
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        audit = Audit.query.get_or_404(audit_id)
        
        audit_checklist = AuditChecklist.query.filter_by(
            id=checklist_id,
            audit_id=audit_id
        ).first_or_404()
        
        # Validar permisos (solo admin o creador de auditoría)
        if user.role != 'admin' and audit.created_by != user_id:
            return jsonify({'error': 'No autorizado para eliminar este checklist'}), 403
        
        template_name = audit_checklist.template.name
        responses_count = audit_checklist.responses.count()
        is_completed = audit_checklist.status == 'Completed'
        
        # Si está completado, requerir confirmación explícita
        if is_completed:
            confirm = request.args.get('confirm', 'false').lower()
            if confirm != 'true':
                return jsonify({
                    'warning': 'Este checklist está completado con respuestas guardadas',
                    'template_name': template_name,
                    'responses_count': responses_count,
                    'status': 'Completed',
                    'message': 'Añada ?confirm=true para confirmar eliminación'
                }), 400
        
        # Eliminar checklist (cascade eliminará las respuestas)
        db.session.delete(audit_checklist)
        db.session.commit()

        # ✅ CRÍTICO: Actualizar estado de auditoría
        audit.update_status_based_on_checklists()
        db.session.commit()

        return jsonify({
            'message': f'Checklist "{template_name}" eliminado exitosamente',
            'deleted_responses': responses_count,
            'audit_status': audit.status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error eliminando checklist: {str(e)}'}), 500


# ========== VALIDACIÓN Y REPORTES (US-006) ==========

@audits_bp.route('/<int:audit_id>/validate-completion', methods=['GET'])
@jwt_required()
def validate_audit_completion(audit_id):
    """
    US-006: Validar si una auditoría puede generar reportes
    Requiere que todos los checklists estén completados
    """
    from app.models.audit import Audit
    from app.models.checklist import AuditChecklist
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        checklists = AuditChecklist.query.filter_by(audit_id=audit_id).all()
        
        # Validación 1: Debe tener checklists
        if len(checklists) == 0:
            return jsonify({
                'can_generate_report': False,
                'error': 'No se puede generar reporte. La auditoría no tiene checklists asignados.',
                'reason': 'no_checklists',
                'total_checklists': 0,
                'completed_checklists': 0,
                'incomplete_checklists': []
            }), 400
        
        # Validación 2: Todos deben estar completados
        completed = [c for c in checklists if c.status == 'Completed']
        incomplete = [c for c in checklists if c.status != 'Completed']
        
        if len(incomplete) > 0:
            incomplete_names = [c.template.name for c in incomplete]
            return jsonify({
                'can_generate_report': False,
                'error': f'No se puede generar reporte. Hay {len(incomplete)} checklist(s) sin completar.',
                'reason': 'incomplete_checklists',
                'total_checklists': len(checklists),
                'completed_checklists': len(completed),
                'incomplete_checklists': incomplete_names
            }), 400
        
        # Validación exitosa
        return jsonify({
            'can_generate_report': True,
            'message': 'Auditoría lista para generar reporte',
            'total_checklists': len(checklists),
            'completed_checklists': len(completed)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error validando auditoría: {str(e)}'}), 500


@audits_bp.route('/<int:audit_id>/report', methods=['GET'])
@jwt_required()
def generate_audit_report(audit_id):
    """US-006: Generar reporte de auditoría en formato real"""
    from app.models.audit import Audit
    from app.models.checklist import AuditChecklist
    from app.services.report_generator import ReportGenerator
    from flask import make_response
    
    try:
        audit = Audit.query.get_or_404(audit_id)
        report_format = request.args.get('format', 'pdf').lower()
        
        # Validación de formato
        if report_format not in ['pdf', 'xlsx', 'csv']:
            return jsonify({'error': 'Formato inválido. Use: pdf, xlsx, o csv'}), 400
        
        # Validación de completitud
        checklists = AuditChecklist.query.filter_by(audit_id=audit_id).all()
        
        if len(checklists) == 0:
            return jsonify({
                'error': 'No se puede generar reporte. La auditoría no tiene checklists asignados.'
            }), 400
        
        incomplete = [c for c in checklists if c.status != 'Completed']
        
        if len(incomplete) > 0:
            incomplete_names = [c.template.name for c in incomplete]
            return jsonify({
                'error': f'No se puede generar reporte. Checklists incompletos: {", ".join(incomplete_names)}'
            }), 400
        
        # Preparar datos para el reporte
        checklist_data = []
        for checklist in checklists:
            summary = get_checklist_summary_internal(checklist.id)
            if summary:
                checklist_data.append({
                    'id': checklist.id,
                    'name': checklist.template.name,
                    'category': checklist.template.category,
                    'summary': summary['summary']
                })
        
        print(f"📊 Generando reporte {report_format.upper()} para auditoría {audit_id}")
        print(f"📋 Checklists incluidos: {len(checklist_data)}")
        
        # ✅ GENERAR REPORTE REAL (NO PLACEHOLDER)
        filename = f'cyberlynx_audit_{audit.id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        
        if report_format == 'pdf':
            buffer = ReportGenerator.generate_pdf_report(audit, checklist_data)
            
            print(f"✅ PDF generado: {buffer.tell()} bytes")
            
            response = make_response(buffer.getvalue())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
            return response
            
        elif report_format == 'xlsx':
            buffer = ReportGenerator.generate_excel_report(audit, checklist_data)
            
            print(f"✅ XLSX generado: {buffer.tell()} bytes")
            
            response = make_response(buffer.getvalue())
            response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'
            return response
            
        elif report_format == 'csv':
            buffer = ReportGenerator.generate_csv_report(audit, checklist_data)
            
            print(f"✅ CSV generado: {buffer.tell()} bytes")
            
            response = make_response(buffer.getvalue())
            response.headers['Content-Type'] = 'text/csv; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
            return response
        
    except Exception as e:
        import traceback
        print("🚨 ERROR generando reporte:")
        traceback.print_exc()
        return jsonify({'error': f'Error generando reporte: {str(e)}'}), 500


# ========== FUNCIONES HELPER INTERNAS ==========

def get_checklist_summary_internal(checklist_id):
    """
    Helper interno para obtener resumen de checklist sin hacer request HTTP
    Reutiliza la lógica de checklists_bp.get_checklist_summary
    """
    from app.models.checklist import AuditChecklist
    
    try:
        audit_checklist = AuditChecklist.query.get(checklist_id)
        if not audit_checklist:
            return None
        
        responses = audit_checklist.responses.all()
        total_questions = audit_checklist.template.questions.count()
        answered_questions = len(responses)
        
        yes_count = sum(1 for r in responses if r.answer == 'Yes')
        no_count = sum(1 for r in responses if r.answer == 'No')
        na_count = sum(1 for r in responses if r.answer == 'N/A')
        
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
        
        return {
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
        }
    except Exception as e:
        print(f"Error en get_checklist_summary_internal: {str(e)}")
        return None