# Documentación Técnica de Cambios Implementados

## Resumen

Este documento describe las soluciones implementadas para:
1. Lógica de estados automáticos de auditorías
2. Corrección de exportación de reportes en formatos XLSX y CSV

---

## 1. Lógica de Estados Automáticos de Auditorías

### Descripción del Problema

El sistema necesitaba gestionar automáticamente los estados de las auditorías basándose en los checklists asignados, sin permitir modificación manual por parte del usuario.

### Estados Definidos

- **Created** (Nuevo): Estado inicial cuando la auditoría no tiene checklists asignados
- **In_Progress** (En proceso): Se activa automáticamente cuando se añade al menos un checklist
- **Completed** (Completado): Se activa automáticamente cuando todos los checklists asignados están completados

### Implementación

#### Archivo: `backend/app/models/audit.py`

Se añadió el método `update_status_based_on_checklists()` a la clase `Audit`:

```python
def update_status_based_on_checklists(self):
    """
    Actualiza automáticamente el estado de la auditoría basándose en los checklists:
    - 'Created': Estado inicial (sin checklists o todos los checklists eliminados)
    - 'In_Progress': Al menos un checklist asignado, pero no todos completados
    - 'Completed': Todos los checklists asignados están completados
    """
    from app.models.checklist import AuditChecklist

    checklists = AuditChecklist.query.filter_by(audit_id=self.id).all()

    if not checklists:
        if self.status != 'Created':
            self.status = 'Created'
            self.started_at = None
            self.completed_at = None
    else:
        all_completed = all(checklist.status == 'Completed' for checklist in checklists)

        if all_completed:
            if self.status != 'Completed':
                self.status = 'Completed'
                self.completed_at = datetime.utcnow()
        else:
            if self.status == 'Created':
                self.status = 'In_Progress'
                self.started_at = datetime.utcnow()
            elif self.status == 'Completed':
                self.status = 'In_Progress'
                self.completed_at = None
```

#### Archivo: `backend/app/routes/r_audits.py`

**1. Al iniciar un nuevo checklist** (endpoint: `POST /api/audits/<audit_id>/checklist/start`):

```python
# Después de crear el checklist
db.session.add(audit_checklist)
db.session.commit()

# Actualizar estado de la auditoría automáticamente
audit.update_status_based_on_checklists()
db.session.commit()
```

**2. Al completar todas las preguntas de un checklist** (endpoint: `POST /api/audits/<audit_id>/checklist/<checklist_id>/answer`):

```python
if answered_questions >= total_questions and audit_checklist.status == 'In_Progress':
    audit_checklist.status = 'Completed'
    audit_checklist.completed_at = datetime.utcnow()
    db.session.commit()

    # Actualizar estado de la auditoría automáticamente
    from app.models.audit import Audit
    audit = Audit.query.get(audit_id)
    audit.update_status_based_on_checklists()
    db.session.commit()
```

### Flujo de Estados

```
┌─────────────────────────────────────────────────────────────┐
│                        ESTADO: Created                       │
│  - Auditoría recién creada                                  │
│  - Sin checklists asignados                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Se añade primer checklist
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     ESTADO: In_Progress                      │
│  - Al menos un checklist asignado                           │
│  - Algunos checklists pendientes o en progreso             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Todos los checklists completados
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      ESTADO: Completed                       │
│  - Todos los checklists finalizados                         │
│  - Auditoría lista para generar reporte final              │
└─────────────────────────────────────────────────────────────┘
```

### Casos de Uso

1. **Auditoría nueva sin checklists**: `Created`
2. **Se inicia el primer checklist**: `Created` → `In_Progress`
3. **Se completan algunos checklists pero no todos**: Permanece en `In_Progress`
4. **Se completan todos los checklists**: `In_Progress` → `Completed`
5. **Se añade un nuevo checklist a auditoría completada**: `Completed` → `In_Progress`

---

## 2. Corrección de Exportación de Reportes (XLSX y CSV)

### Descripción del Problema

Los métodos `generate_excel_report()` y `generate_csv_report()` estaban incompletos en el archivo `report_generator.py`, causando errores al intentar exportar reportes en estos formatos.

### Implementación Corregida

#### Archivo: `backend/app/services/report_generator.py`

**Formato XLSX (Excel):**

```python
@staticmethod
def generate_excel_report(audit, checklist_data):
    buffer = BytesIO()
    wb = Workbook()

    # HOJA 1: RESUMEN
    ws_summary = wb.active
    ws_summary.title = "Resumen"

    # Título principal
    ws_summary['A1'] = "Reporte de Auditoría de Seguridad - CyberLynx"
    ws_summary['A1'].font = Font(size=16, bold=True, color="1976D2")
    ws_summary.merge_cells('A1:D1')

    # Información de la auditoría
    ws_summary['A3'] = "Nombre de la auditoría:"
    ws_summary['B3'] = audit.name
    ws_summary['A4'] = "Estado:"
    ws_summary['B4'] = audit.status
    ws_summary['A5'] = "Fecha de inicio:"
    ws_summary['B5'] = audit.created_at.strftime('%d/%m/%Y %H:%M')
    ws_summary['A6'] = "Fecha de finalización:"
    ws_summary['B6'] = audit.completed_at.strftime('%d/%m/%Y %H:%M') if audit.completed_at else 'En progreso'

    # Calcular estadísticas globales
    total_questions = 0
    total_yes = 0
    total_no = 0
    total_na = 0

    for checklist in checklist_data:
        summary = checklist['summary']
        total_questions += summary['total_questions']
        total_yes += summary['yes_count']
        total_no += summary['no_count']
        total_na += summary['na_count']

    compliance_rate = round((total_yes / (total_yes + total_no) * 100), 2) if (total_yes + total_no) > 0 else 0

    # Resumen ejecutivo
    ws_summary['A9'] = "RESUMEN EJECUTIVO"
    ws_summary['A9'].font = Font(bold=True, size=14)
    ws_summary['A10'] = "Preguntas evaluadas:"
    ws_summary['B10'] = total_questions
    ws_summary['A11'] = "Cumple (Sí):"
    ws_summary['B11'] = total_yes
    ws_summary['A12'] = "No cumple (No):"
    ws_summary['B12'] = total_no
    ws_summary['A13'] = "No aplica (N/A):"
    ws_summary['B13'] = total_na
    ws_summary['A14'] = "Porcentaje de cumplimiento:"
    ws_summary['B14'] = f"{compliance_rate}%"

    # HOJAS ADICIONALES: Una por cada checklist
    header_fill = PatternFill(start_color="1976D2", end_color="1976D2", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    for checklist in checklist_data:
        ws = wb.create_sheet(title=checklist['name'][:31])  # Límite de Excel: 31 caracteres

        ws['A1'] = checklist['name']
        ws['A1'].font = Font(size=14, bold=True, color="1976D2")
        ws.merge_cells('A1:F1')

        ws['A2'] = f"Categoría: {checklist['category']}"

        # Encabezados de tabla
        ws['A4'] = "Severidad"
        ws['B4'] = "Total"
        ws['C4'] = "Sí"
        ws['D4'] = "No"
        ws['E4'] = "N/A"
        ws['F4'] = "Sin responder"

        # Aplicar estilos a encabezados
        for col in ['A', 'B', 'C', 'D', 'E', 'F']:
            ws[f'{col}4'].fill = header_fill
            ws[f'{col}4'].font = header_font
            ws[f'{col}4'].alignment = Alignment(horizontal='center')

        # Datos de severidad
        row = 5
        sev_map = {'Critical': 'Crítica', 'High': 'Alta', 'Medium': 'Media', 'Low': 'Baja'}
        summary = checklist['summary']

        for sev in ['Critical', 'High', 'Medium', 'Low']:
            if sev in summary['severity_breakdown']:
                stats = summary['severity_breakdown'][sev]
                ws[f'A{row}'] = sev_map.get(sev, sev)
                ws[f'B{row}'] = stats['total']
                ws[f'C{row}'] = stats['yes']
                ws[f'D{row}'] = stats['no']
                ws[f'E{row}'] = stats['na']
                ws[f'F{row}'] = stats['unanswered']

                # Centrar contenido
                for col in ['A', 'B', 'C', 'D', 'E', 'F']:
                    ws[f'{col}{row}'].alignment = Alignment(horizontal='center')

                row += 1

    wb.save(buffer)
    buffer.seek(0)
    return buffer
```

**Formato CSV:**

```python
@staticmethod
def generate_csv_report(audit, checklist_data):
    buffer = StringIO()
    writer = csv.writer(buffer)

    # Encabezado del reporte
    writer.writerow(['Reporte de Auditoría de Seguridad - CyberLynx'])
    writer.writerow([])

    # Información de la auditoría
    writer.writerow(['Nombre de la auditoría:', audit.name])
    writer.writerow(['Estado:', audit.status])
    writer.writerow(['Fecha de inicio:', audit.created_at.strftime('%d/%m/%Y %H:%M')])
    writer.writerow(['Fecha de finalización:', audit.completed_at.strftime('%d/%m/%Y %H:%M') if audit.completed_at else 'En progreso'])

    if audit.description:
        writer.writerow(['Descripción:', audit.description])

    writer.writerow([])

    # Calcular estadísticas globales
    total_questions = 0
    total_yes = 0
    total_no = 0
    total_na = 0

    for checklist in checklist_data:
        summary = checklist['summary']
        total_questions += summary['total_questions']
        total_yes += summary['yes_count']
        total_no += summary['no_count']
        total_na += summary['na_count']

    compliance_rate = round((total_yes / (total_yes + total_no) * 100), 2) if (total_yes + total_no) > 0 else 0

    # Resumen ejecutivo
    writer.writerow(['RESUMEN EJECUTIVO'])
    writer.writerow(['Preguntas evaluadas:', total_questions])
    writer.writerow(['Cumple (Sí):', total_yes])
    writer.writerow(['No cumple (No):', total_no])
    writer.writerow(['No aplica (N/A):', total_na])
    writer.writerow(['Porcentaje de cumplimiento:', f"{compliance_rate}%"])
    writer.writerow([])

    # Detalle por checklist
    writer.writerow(['DETALLE POR CHECKLIST'])
    writer.writerow([])

    sev_map = {'Critical': 'Crítica', 'High': 'Alta', 'Medium': 'Media', 'Low': 'Baja'}

    for checklist in checklist_data:
        writer.writerow([f"Checklist: {checklist['name']} ({checklist['category']})"])
        writer.writerow(['Severidad', 'Total', 'Sí', 'No', 'N/A', 'Sin responder'])

        summary = checklist['summary']
        for sev in ['Critical', 'High', 'Medium', 'Low']:
            if sev in summary['severity_breakdown']:
                stats = summary['severity_breakdown'][sev]
                writer.writerow([
                    sev_map.get(sev, sev),
                    stats['total'],
                    stats['yes'],
                    stats['no'],
                    stats['na'],
                    stats['unanswered']
                ])

        writer.writerow([])

    # Pie del reporte
    writer.writerow([f'Reporte generado por CyberLynx el {datetime.now().strftime("%d/%m/%Y %H:%M")}'])

    # Convertir a BytesIO con codificación UTF-8-BOM para compatibilidad con Excel
    output = BytesIO()
    output.write(buffer.getvalue().encode('utf-8-sig'))
    output.seek(0)
    return output
```

### Cambios Clave

1. **XLSX**:
   - Hoja de resumen con información general
   - Una hoja por cada checklist con desglose por severidad
   - Formato visual con colores y estilos
   - Límite de 31 caracteres en nombres de hojas (restricción de Excel)

2. **CSV**:
   - Estructura jerárquica clara
   - Resumen ejecutivo al inicio
   - Detalle por checklist
   - Codificación UTF-8-BOM para compatibilidad con Excel en español

### Uso

Los reportes se generan desde el endpoint:

```
GET /api/reports/audits/<audit_id>/report?format=xlsx
GET /api/reports/audits/<audit_id>/report?format=csv
GET /api/reports/audits/<audit_id>/report?format=pdf  (ya funcionaba)
```

---

## 3. Pruebas Recomendadas

### Estados Automáticos

1. Crear una auditoría y verificar que el estado sea `Created`
2. Añadir un checklist y verificar el cambio a `In_Progress`
3. Completar todas las preguntas del checklist y verificar el cambio a `Completed`
4. Añadir un segundo checklist a la auditoría completada y verificar el retorno a `In_Progress`
5. Completar el segundo checklist y verificar el retorno a `Completed`

### Exportación de Reportes

1. Crear una auditoría con al menos un checklist completado
2. Exportar en formato PDF y verificar contenido
3. Exportar en formato XLSX y verificar:
   - Hoja de resumen con información general
   - Hojas adicionales por cada checklist
   - Formato visual correcto
4. Exportar en formato CSV y verificar:
   - Estructura de datos correcta
   - Compatibilidad con Excel
   - Codificación UTF-8 correcta

---

## 4. Mantenimiento Futuro

### Estados Automáticos

Si se requieren nuevos estados o lógica adicional:
1. Modificar el método `update_status_based_on_checklists()` en `audit.py`
2. Actualizar la lista de estados válidos en `get_valid_statuses()`
3. Añadir timestamps adicionales si es necesario

### Reportes

Si se requieren nuevos campos o secciones:
1. Modificar los métodos en `report_generator.py`
2. Actualizar la estructura de `checklist_data` en `r_reports.py` si es necesario
3. Mantener consistencia entre los tres formatos (PDF, XLSX, CSV)

---

## Conclusión

Las implementaciones realizadas proporcionan:
- Gestión automática y robusta de estados de auditorías
- Exportación completa de reportes en múltiples formatos
- Código mantenible y bien documentado
- Integración transparente con el sistema existente
