import os
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import csv

class ReportGenerator:
    """Generador de reportes en múltiples formatos para auditorías"""
    
    @staticmethod
    def generate_pdf_report(audit, checklist_data):
        """
        Genera reporte de auditoría en formato PDF
        
        Args:
            audit: Objeto Audit con datos de la auditoría
            checklist_data: Lista de diccionarios con datos de checklists ejecutados
            
        Returns:
            BytesIO: Buffer con el PDF generado
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=18)
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=HexColor('#1976d2'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=HexColor('#333333'),
            spaceAfter=12
        )
        
        # Contenido del documento
        story = []
        
        # === PORTADA ===
        story.append(Spacer(1, 2*inch))
        story.append(Paragraph("CyberLynx", title_style))
        story.append(Paragraph("Security Audit Report", styles['Heading2']))
        story.append(Spacer(1, 0.5*inch))
        
        # Información de auditoría
        audit_info = f"""
        <b>Audit Name:</b> {audit.name}<br/>
        <b>Status:</b> {audit.status}<br/>
        <b>Created:</b> {audit.created_at.strftime('%Y-%m-%d %H:%M')}<br/>
        <b>Completed:</b> {audit.completed_at.strftime('%Y-%m-%d %H:%M') if audit.completed_at else 'In Progress'}<br/>
        """
        story.append(Paragraph(audit_info, styles['Normal']))
        
        if audit.description:
            story.append(Spacer(1, 0.3*inch))
            story.append(Paragraph(f"<b>Description:</b><br/>{audit.description}", styles['Normal']))
        
        story.append(PageBreak())
        
        # === RESUMEN EJECUTIVO ===
        story.append(Paragraph("Executive Summary", heading_style))
        
        # Calcular métricas agregadas
        total_questions = 0
        total_yes = 0
        total_no = 0
        total_na = 0
        critical_findings = []
        high_findings = []
        
        for checklist in checklist_data:
            summary = checklist['summary']
            total_questions += summary['total_questions']
            total_yes += summary['yes_count']
            total_no += summary['no_count']
            total_na += summary['na_count']
            
            # Recopilar hallazgos críticos
            for severity, stats in summary['severity_breakdown'].items():
                if severity == 'Critical' and stats['no'] > 0:
                    critical_findings.append({
                        'checklist': checklist['name'],
                        'count': stats['no']
                    })
                elif severity == 'High' and stats['no'] > 0:
                    high_findings.append({
                        'checklist': checklist['name'],
                        'count': stats['no']
                    })
        
        compliance_rate = round((total_yes / (total_yes + total_no) * 100), 2) if (total_yes + total_no) > 0 else 0
        
        summary_text = f"""
        <b>Total Questions Evaluated:</b> {total_questions}<br/>
        <b>Compliant (Yes):</b> {total_yes}<br/>
        <b>Non-Compliant (No):</b> {total_no}<br/>
        <b>Not Applicable (N/A):</b> {total_na}<br/>
        <b>Overall Compliance Rate:</b> {compliance_rate}%<br/>
        <br/>
        <b>Critical Findings:</b> {len(critical_findings)}<br/>
        <b>High Priority Findings:</b> {len(high_findings)}<br/>
        """
        story.append(Paragraph(summary_text, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # === DETALLES POR CHECKLIST ===
        story.append(PageBreak())
        story.append(Paragraph("Checklist Details", heading_style))
        
        for checklist in checklist_data:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph(f"<b>{checklist['name']}</b> ({checklist['category']})", styles['Heading3']))
            
            summary = checklist['summary']
            
            # Tabla de resumen por severidad
            severity_data = [['Severity', 'Total', 'Yes', 'No', 'N/A', 'Unanswered']]
            
            for severity in ['Critical', 'High', 'Medium', 'Low']:
                if severity in summary['severity_breakdown']:
                    stats = summary['severity_breakdown'][severity]
                    severity_data.append([
                        severity,
                        stats['total'],
                        stats['yes'],
                        stats['no'],
                        stats['na'],
                        stats['unanswered']
                    ])
            
            severity_table = Table(severity_data, colWidths=[1.2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch])
            severity_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1976d2')),
                ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#FFFFFF')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f5f5f5')),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc'))
            ]))
            
            story.append(severity_table)
            story.append(Spacer(1, 0.3*inch))
        
        # === HALLAZGOS CRÍTICOS ===
        if critical_findings or high_findings:
            story.append(PageBreak())
            story.append(Paragraph("Critical & High Priority Findings", heading_style))
            
            findings_data = [['Checklist', 'Severity', 'Count', 'Action Required']]
            
            for finding in critical_findings:
                findings_data.append([
                    finding['checklist'],
                    'Critical',
                    finding['count'],
                    'Immediate action required'
                ])
            
            for finding in high_findings:
                findings_data.append([
                    finding['checklist'],
                    'High',
                    finding['count'],
                    'Address within 30 days'
                ])
            
            findings_table = Table(findings_data, colWidths=[2.5*inch, 1*inch, 0.8*inch, 2*inch])
            findings_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#d32f2f')),
                ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#FFFFFF')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#ffebee'))
            ]))
            
            story.append(findings_table)
        
        # === RECOMENDACIONES ===
        story.append(PageBreak())
        story.append(Paragraph("Recommendations", heading_style))
        
        recommendations = [
            "1. Address all Critical findings immediately to mitigate high-risk vulnerabilities.",
            "2. Develop an action plan for High priority findings within 30 days.",
            "3. Schedule follow-up audits quarterly to ensure continuous compliance.",
            "4. Implement security awareness training for all staff members.",
            "5. Review and update security policies based on identified gaps."
        ]
        
        for rec in recommendations:
            story.append(Paragraph(rec, styles['Normal']))
            story.append(Spacer(1, 0.1*inch))
        
        # === FOOTER ===
        story.append(Spacer(1, 0.5*inch))
        footer_text = f"<i>Report generated by CyberLynx on {datetime.now().strftime('%Y-%m-%d %H:%M')}</i>"
        story.append(Paragraph(footer_text, styles['Normal']))
        
        # Construir PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_excel_report(audit, checklist_data):
        """
        Genera reporte de auditoría en formato Excel
        
        Args:
            audit: Objeto Audit con datos de la auditoría
            checklist_data: Lista de diccionarios con datos de checklists ejecutados
            
        Returns:
            BytesIO: Buffer con el archivo Excel generado
        """
        buffer = BytesIO()
        wb = Workbook()
        
        # === HOJA 1: RESUMEN ===
        ws_summary = wb.active
        ws_summary.title = "Summary"
        
        # Título
        ws_summary['A1'] = "CyberLynx Security Audit Report"
        ws_summary['A1'].font = Font(size=16, bold=True, color="1976D2")
        ws_summary.merge_cells('A1:D1')
        
        # Información de auditoría
        ws_summary['A3'] = "Audit Name:"
        ws_summary['B3'] = audit.name
        ws_summary['A4'] = "Status:"
        ws_summary['B4'] = audit.status
        ws_summary['A5'] = "Created:"
        ws_summary['B5'] = audit.created_at.strftime('%Y-%m-%d %H:%M')
        ws_summary['A6'] = "Completed:"
        ws_summary['B6'] = audit.completed_at.strftime('%Y-%m-%d %H:%M') if audit.completed_at else 'In Progress'
        
        # Métricas agregadas
        total_questions = sum(c['summary']['total_questions'] for c in checklist_data)
        total_yes = sum(c['summary']['yes_count'] for c in checklist_data)
        total_no = sum(c['summary']['no_count'] for c in checklist_data)
        total_na = sum(c['summary']['na_count'] for c in checklist_data)
        compliance_rate = round((total_yes / (total_yes + total_no) * 100), 2) if (total_yes + total_no) > 0 else 0
        
        ws_summary['A8'] = "Total Questions:"
        ws_summary['B8'] = total_questions
        ws_summary['A9'] = "Compliant (Yes):"
        ws_summary['B9'] = total_yes
        ws_summary['A10'] = "Non-Compliant (No):"
        ws_summary['B10'] = total_no
        ws_summary['A11'] = "Not Applicable (N/A):"
        ws_summary['B11'] = total_na
        ws_summary['A12'] = "Compliance Rate:"
        ws_summary['B12'] = f"{compliance_rate}%"
        
        # Aplicar estilos
        for row in range(3, 13):
            ws_summary[f'A{row}'].font = Font(bold=True)
        
        # Ajustar ancho de columnas
        ws_summary.column_dimensions['A'].width = 20
        ws_summary.column_dimensions['B'].width = 30
        
        # === HOJA 2: DETALLE POR CHECKLIST ===
        ws_details = wb.create_sheet("Checklist Details")
        
        # Encabezados
        headers = ['Checklist', 'Category', 'Total Questions', 'Yes', 'No', 'N/A', 'Compliance %']
        ws_details.append(headers)
        
        # Aplicar estilo a encabezados
        header_fill = PatternFill(start_color="1976D2", end_color="1976D2", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col_num, header in enumerate(headers, 1):
            cell = ws_details.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
        
        # Datos
        for checklist in checklist_data:
            summary = checklist['summary']
            compliance = round((summary['yes_count'] / (summary['yes_count'] + summary['no_count']) * 100), 2) \
                         if (summary['yes_count'] + summary['no_count']) > 0 else 0
            
            ws_details.append([
                checklist['name'],
                checklist['category'],
                summary['total_questions'],
                summary['yes_count'],
                summary['no_count'],
                summary['na_count'],
                f"{compliance}%"
            ])
        
        # Ajustar ancho de columnas
        for column_cells in ws_details.columns:
            length = max(len(str(cell.value)) for cell in column_cells)
            ws_details.column_dimensions[column_cells[0].column_letter].width = length + 2
        
        # === HOJA 3: HALLAZGOS POR SEVERIDAD ===
        ws_severity = wb.create_sheet("Findings by Severity")
        
        # Encabezados
        sev_headers = ['Checklist', 'Severity', 'Total', 'Yes', 'No', 'N/A', 'Unanswered']
        ws_severity.append(sev_headers)
        
        for col_num, header in enumerate(sev_headers, 1):
            cell = ws_severity.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
        
        # Datos por checklist y severidad
        for checklist in checklist_data:
            summary = checklist['summary']
            for severity in ['Critical', 'High', 'Medium', 'Low']:
                if severity in summary['severity_breakdown']:
                    stats = summary['severity_breakdown'][severity]
                    ws_severity.append([
                        checklist['name'],
                        severity,
                        stats['total'],
                        stats['yes'],
                        stats['no'],
                        stats['na'],
                        stats['unanswered']
                    ])
        
        # Ajustar ancho de columnas
        for column_cells in ws_severity.columns:
            length = max(len(str(cell.value)) for cell in column_cells)
            ws_severity.column_dimensions[column_cells[0].column_letter].width = length + 2
        
        # Guardar workbook en buffer
        wb.save(buffer)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_csv_report(audit, checklist_data):
        """
        Genera reporte de auditoría en formato CSV simple
        
        Args:
            audit: Objeto Audit con datos de la auditoría
            checklist_data: Lista de diccionarios con datos de checklists ejecutados
            
        Returns:
            BytesIO: Buffer con el archivo CSV generado
        """
        buffer = BytesIO()
        
        # Crear CSV en modo texto
        text_buffer = io.StringIO()
        writer = csv.writer(text_buffer)
        
        # === INFORMACIÓN DE AUDITORÍA ===
        writer.writerow(['CyberLynx Security Audit Report'])
        writer.writerow([])
        writer.writerow(['Audit Name', audit.name])
        writer.writerow(['Status', audit.status])
        writer.writerow(['Created', audit.created_at.strftime('%Y-%m-%d %H:%M')])
        writer.writerow(['Completed', audit.completed_at.strftime('%Y-%m-%d %H:%M') if audit.completed_at else 'In Progress'])
        writer.writerow([])
        
        # === MÉTRICAS AGREGADAS ===
        total_questions = sum(c['summary']['total_questions'] for c in checklist_data)
        total_yes = sum(c['summary']['yes_count'] for c in checklist_data)
        total_no = sum(c['summary']['no_count'] for c in checklist_data)
        total_na = sum(c['summary']['na_count'] for c in checklist_data)
        compliance_rate = round((total_yes / (total_yes + total_no) * 100), 2) if (total_yes + total_no) > 0 else 0
        
        writer.writerow(['Total Questions', total_questions])
        writer.writerow(['Compliant (Yes)', total_yes])
        writer.writerow(['Non-Compliant (No)', total_no])
        writer.writerow(['Not Applicable (N/A)', total_na])
        writer.writerow(['Compliance Rate', f'{compliance_rate}%'])
        writer.writerow([])
        
        # === DETALLES POR CHECKLIST ===
        writer.writerow(['Checklist Details'])
        writer.writerow(['Checklist', 'Category', 'Total Questions', 'Yes', 'No', 'N/A', 'Compliance %'])
        
        for checklist in checklist_data:
            summary = checklist['summary']
            compliance = round((summary['yes_count'] / (summary['yes_count'] + summary['no_count']) * 100), 2) \
                         if (summary['yes_count'] + summary['no_count']) > 0 else 0
            
            writer.writerow([
                checklist['name'],
                checklist['category'],
                summary['total_questions'],
                summary['yes_count'],
                summary['no_count'],
                summary['na_count'],
                f'{compliance}%'
            ])
        
        writer.writerow([])
        
        # === HALLAZGOS POR SEVERIDAD ===
        writer.writerow(['Findings by Severity'])
        writer.writerow(['Checklist', 'Severity', 'Total', 'Yes', 'No', 'N/A', 'Unanswered'])
        
        for checklist in checklist_data:
            summary = checklist['summary']
            for severity in ['Critical', 'High', 'Medium', 'Low']:
                if severity in summary['severity_breakdown']:
                    stats = summary['severity_breakdown'][severity]
                    writer.writerow([
                        checklist['name'],
                        severity,
                        stats['total'],
                        stats['yes'],
                        stats['no'],
                        stats['na'],
                        stats['unanswered']
                    ])
        
        # Convertir StringIO a BytesIO
        buffer.write(text_buffer.getvalue().encode('utf-8'))
        buffer.seek(0)
        return buffer


# Importar io para StringIO en generate_csv_report
import io