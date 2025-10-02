from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.audit import Audit
from app.models.checklist import AuditChecklist
from app.services.report_generator import ReportGenerator
from datetime import datetime

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/audits/<int:audit_id>/report', methods=['GET'])
@jwt_required()
def generate_audit_report(audit_id):
    """
    US-006: Generar reporte de auditoría en formato especificado
    
    Query params:
        format: pdf, xlsx, csv (default: pdf)
    """
    try:
        # Validar formato
        report_format = request.args.get('format', 'pdf').lower()
        
        if report_format not in ['pdf', 'xlsx', 'csv']:
            return jsonify({'error': 'Invalid format. Must be pdf, xlsx, or csv'}), 400
        
        # Obtener auditoría
        audit = Audit.query.get_or_404(audit_id)
        
        # Obtener checklists de la auditoría
        audit_checklists = AuditChecklist.query.filter_by(audit_id=audit_id).all()
        
        if not audit_checklists:
            return jsonify({'error': 'No checklists found for this audit. Cannot generate report.'}), 400
        
        # Preparar datos para el reporte
        checklist_data = []
        
        for audit_checklist in audit_checklists:
            # Obtener summary del checklist (usando endpoint existente)
            from app.routes.r_checklists import checklists_bp
            
            # Obtener todas las respuestas
            responses = audit_checklist.responses.all()
            
            # Calcular estadísticas
            total_questions = audit_checklist.template.questions.count()
            answered_questions = len(responses)
            
            yes_count = sum(1 for r in responses if r.answer == 'Yes')
            no_count = sum(1 for r in responses if r.answer == 'No')
            na_count = sum(1 for r in responses if r.answer == 'N/A')
            
            # Estadísticas por severidad
            severity_stats = {}
            for question in audit_checklist.template.questions:
                response = next((r for r in responses if r.question_id == question.id), None)
                
                if question.severity not in severity_stats:
                    severity_stats[question.severity] = {
                        'total': 0, 'yes': 0, 'no': 0, 'na': 0, 'unanswered': 0
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
            
            checklist_data.append({
                'name': audit_checklist.template.name,
                'category': audit_checklist.template.category,
                'summary': {
                    'total_questions': total_questions,
                    'answered_questions': answered_questions,
                    'yes_count': yes_count,
                    'no_count': no_count,
                    'na_count': na_count,
                    'severity_breakdown': severity_stats
                }
            })
        
        # Generar reporte según formato
        if report_format == 'pdf':
            buffer = ReportGenerator.generate_pdf_report(audit, checklist_data)
            mimetype = 'application/pdf'
            filename = f'CyberLynx_Audit_{audit.id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        
        elif report_format == 'xlsx':
            buffer = ReportGenerator.generate_excel_report(audit, checklist_data)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename = f'CyberLynx_Audit_{audit.id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        
        else:  # csv
            buffer = ReportGenerator.generate_csv_report(audit, checklist_data)
            mimetype = 'text/csv'
            filename = f'CyberLynx_Audit_{audit.id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        return send_file(
            buffer,
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"🚨 Report generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error generating report: {str(e)}'}), 500


@reports_bp.route('/audits/<int:audit_id>/report/preview', methods=['GET'])
@jwt_required()
def preview_report_data(audit_id):
    """
    Preview de datos que se incluirán en el reporte (para debug/testing)
    """
    try:
        audit = Audit.query.get_or_404(audit_id)
        audit_checklists = AuditChecklist.query.filter_by(audit_id=audit_id).all()
        
        if not audit_checklists:
            return jsonify({'error': 'No checklists found'}), 400
        
        preview_data = {
            'audit': audit.to_dict(),
            'checklists_count': len(audit_checklists),
            'checklists': [
                {
                    'name': ac.template.name,
                    'category': ac.template.category,
                    'progress': ac.to_dict()['progress']
                } for ac in audit_checklists
            ]
        }
        
        return jsonify(preview_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500