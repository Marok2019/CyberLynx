# Código Explicado: Lógica de Estados Automáticos de Auditorías

Este documento explica detalladamente el código implementado para la gestión automática de estados de auditorías.

---

## Ubicación del Código

### 1. Modelo de Auditoría
**Archivo:** `backend/app/models/audit.py`

### 2. Rutas de Auditoría
**Archivo:** `backend/app/routes/r_audits.py`

---

## Código del Modelo (audit.py)

### Método Principal: `update_status_based_on_checklists()`

```python
def update_status_based_on_checklists(self):
    """
    Actualiza automáticamente el estado de la auditoría basándose en los checklists:
    - 'Created': Estado inicial (sin checklists o todos los checklists eliminados)
    - 'In_Progress': Al menos un checklist asignado, pero no todos completados
    - 'Completed': Todos los checklists asignados están completados
    """
    from app.models.checklist import AuditChecklist

    # Paso 1: Obtener todos los checklists de esta auditoría
    checklists = AuditChecklist.query.filter_by(audit_id=self.id).all()

    # Paso 2: Si NO hay checklists, el estado debe ser "Created"
    if not checklists:
        if self.status != 'Created':
            self.status = 'Created'
            self.started_at = None        # Limpiar fecha de inicio
            self.completed_at = None      # Limpiar fecha de finalización

    # Paso 3: Si HAY checklists, verificar si todos están completados
    else:
        # Verificar si TODOS los checklists están completados
        all_completed = all(checklist.status == 'Completed' for checklist in checklists)

        # Caso 3.1: Todos los checklists están completados
        if all_completed:
            if self.status != 'Completed':
                self.status = 'Completed'
                self.completed_at = datetime.utcnow()  # Registrar fecha de finalización

        # Caso 3.2: Hay checklists pero NO todos están completados
        else:
            # Si el estado actual es "Created", cambiar a "In_Progress"
            if self.status == 'Created':
                self.status = 'In_Progress'
                self.started_at = datetime.utcnow()  # Registrar fecha de inicio

            # Si el estado era "Completed", volver a "In_Progress"
            elif self.status == 'Completed':
                self.status = 'In_Progress'
                self.completed_at = None  # Limpiar fecha de finalización
```

---

## Explicación Paso a Paso

### Paso 1: Obtener Checklists
```python
checklists = AuditChecklist.query.filter_by(audit_id=self.id).all()
```
- Consulta la base de datos para obtener TODOS los checklists asociados a esta auditoría
- `self.id` es el ID de la auditoría actual
- Devuelve una lista (puede estar vacía)

### Paso 2: Sin Checklists → Estado "Created"
```python
if not checklists:
    if self.status != 'Created':
        self.status = 'Created'
        self.started_at = None
        self.completed_at = None
```
- Si la lista de checklists está vacía (`not checklists`)
- Y el estado NO es "Created" (para evitar operaciones innecesarias)
- Establecer el estado como "Created"
- Limpiar las fechas de inicio y finalización

### Paso 3: Con Checklists → Verificar Completitud

#### 3.1 Verificar si Todos Están Completados
```python
all_completed = all(checklist.status == 'Completed' for checklist in checklists)
```
- La función `all()` devuelve `True` solo si TODOS los elementos cumplen la condición
- Recorre cada checklist y verifica si su estado es "Completed"
- Si al menos uno NO está completado, `all_completed` será `False`

#### 3.2 Todos Completados → Estado "Completed"
```python
if all_completed:
    if self.status != 'Completed':
        self.status = 'Completed'
        self.completed_at = datetime.utcnow()
```
- Si todos los checklists están completados
- Y el estado NO es "Completed" (para evitar operaciones innecesarias)
- Cambiar el estado a "Completed"
- Registrar la fecha y hora de finalización

#### 3.3 NO Todos Completados → Estado "In_Progress"
```python
else:
    if self.status == 'Created':
        self.status = 'In_Progress'
        self.started_at = datetime.utcnow()

    elif self.status == 'Completed':
        self.status = 'In_Progress'
        self.completed_at = None
```

**Caso A: Transición desde "Created"**
- Si el estado actual es "Created" (primera vez que se añade un checklist)
- Cambiar a "In_Progress"
- Registrar la fecha y hora de inicio

**Caso B: Regresión desde "Completed"**
- Si el estado era "Completed" pero se añadió un nuevo checklist
- Volver a "In_Progress"
- Limpiar la fecha de finalización

---

## Integración en las Rutas

### Integración 1: Al Iniciar un Checklist

**Archivo:** `backend/app/routes/r_audits.py`
**Endpoint:** `POST /api/audits/<audit_id>/checklist/start`

```python
@audits_bp.route('/<int:audit_id>/checklist/start', methods=['POST'])
@jwt_required()
def start_audit_checklist(audit_id):
    """US-005: Iniciar checklist en una auditoría"""
    from app.models.audit import Audit
    from app.models.checklist import ChecklistTemplate, AuditChecklist

    try:
        # 1. Obtener la auditoría
        audit = Audit.query.get_or_404(audit_id)
        data = request.get_json()

        # 2. Validaciones...
        if not data or not data.get('template_id'):
            return jsonify({'error': 'template_id is required'}), 400

        template_id = data.get('template_id')
        template = ChecklistTemplate.query.get_or_404(template_id)

        # 3. Verificar si ya existe un checklist activo para este template
        existing = AuditChecklist.query.filter_by(
            audit_id=audit_id,
            template_id=template_id,
            status='In_Progress'
        ).first()

        if existing:
            return jsonify({'error': 'Checklist already in progress for this template'}), 400

        # 4. Crear nueva instancia de checklist
        audit_checklist = AuditChecklist(
            audit_id=audit_id,
            template_id=template_id,
            status='In_Progress'
        )

        db.session.add(audit_checklist)
        db.session.commit()

        # ⭐ PUNTO CLAVE: Actualizar estado de la auditoría automáticamente
        audit.update_status_based_on_checklists()
        db.session.commit()

        return jsonify({
            'message': 'Checklist started successfully',
            'checklist': audit_checklist.to_dict(),
            'audit_status': audit.status  # ← Devolver el nuevo estado
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error starting checklist: {str(e)}'}), 500
```

**¿Qué hace?**
1. Crea un nuevo checklist para la auditoría
2. Guarda el checklist en la base de datos
3. **Llama a `update_status_based_on_checklists()`** para actualizar el estado automáticamente
4. Guarda el nuevo estado en la base de datos
5. Devuelve el estado actualizado en la respuesta

---

### Integración 2: Al Responder una Pregunta

**Archivo:** `backend/app/routes/r_audits.py`
**Endpoint:** `POST /api/audits/<audit_id>/checklist/<checklist_id>/answer`

```python
@audits_bp.route('/<int:audit_id>/checklist/<int:checklist_id>/answer', methods=['POST'])
@jwt_required()
def answer_checklist_question(audit_id, checklist_id):
    """US-005: Responder pregunta del checklist"""
    from app.models.checklist import AuditChecklist, ChecklistResponse, ChecklistQuestion

    try:
        # 1. Obtener el checklist
        audit_checklist = AuditChecklist.query.get_or_404(checklist_id)

        # 2. Validaciones...
        if audit_checklist.audit_id != audit_id:
            return jsonify({'error': 'Checklist does not belong to this audit'}), 400

        if audit_checklist.status == 'Completed':
            return jsonify({'error': 'Checklist already completed'}), 400

        data = request.get_json()

        # ... más validaciones ...

        # 3. Guardar la respuesta (crear o actualizar)
        # ... código de guardado de respuesta ...

        db.session.commit()

        # 4. Verificar si se completó el checklist
        total_questions = audit_checklist.template.questions.count()
        answered_questions = audit_checklist.responses.count()

        if answered_questions >= total_questions and audit_checklist.status == 'In_Progress':
            # Marcar el checklist como completado
            audit_checklist.status = 'Completed'
            audit_checklist.completed_at = datetime.utcnow()
            db.session.commit()

            # ⭐ PUNTO CLAVE: Actualizar estado de la auditoría automáticamente
            from app.models.audit import Audit
            audit = Audit.query.get(audit_id)
            audit.update_status_based_on_checklists()
            db.session.commit()

        return jsonify({
            'message': 'Answer saved successfully',
            'checklist': audit_checklist.to_dict(),
            'audit_status': audit_checklist.audit.status  # ← Devolver el nuevo estado
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error saving answer: {str(e)}'}), 500
```

**¿Qué hace?**
1. Guarda la respuesta a una pregunta
2. Verifica si se han respondido todas las preguntas del checklist
3. Si es así, marca el checklist como "Completed"
4. **Llama a `update_status_based_on_checklists()`** para verificar si la auditoría debe cambiar a "Completed"
5. Devuelve el estado actualizado en la respuesta

---

## Tabla de Transiciones

| Estado Actual | Acción | Nuevo Estado | Timestamp Actualizado |
|--------------|--------|--------------|---------------------|
| Created | Se añade primer checklist | In_Progress | started_at |
| In_Progress | Se completan algunos checklists | In_Progress | - |
| In_Progress | Se completan TODOS los checklists | Completed | completed_at |
| Completed | Se añade un nuevo checklist | In_Progress | completed_at = NULL |
| In_Progress | Se eliminan todos los checklists | Created | started_at = NULL, completed_at = NULL |

---

## Ejemplos de Uso

### Ejemplo 1: Nueva Auditoría

```python
# 1. Crear auditoría
audit = Audit(name="Auditoría de Red", created_by=1)
db.session.add(audit)
db.session.commit()
# Estado: Created

# 2. Añadir primer checklist
checklist = AuditChecklist(audit_id=audit.id, template_id=1, status='In_Progress')
db.session.add(checklist)
db.session.commit()

audit.update_status_based_on_checklists()
db.session.commit()
# Estado: In_Progress (started_at registrado)
```

### Ejemplo 2: Completar Auditoría

```python
# Todos los checklists están completados
audit.update_status_based_on_checklists()
db.session.commit()
# Estado: Completed (completed_at registrado)
```

### Ejemplo 3: Reapertura de Auditoría

```python
# La auditoría está completada, añadimos un nuevo checklist
checklist = AuditChecklist(audit_id=audit.id, template_id=2, status='In_Progress')
db.session.add(checklist)
db.session.commit()

audit.update_status_based_on_checklists()
db.session.commit()
# Estado: In_Progress (completed_at eliminado)
```

---

## Consideraciones Importantes

1. **Inmutabilidad del Usuario**: El usuario NO puede modificar el estado manualmente
2. **Atomicidad**: Los cambios se guardan con `db.session.commit()`
3. **Idempotencia**: Llamar al método múltiples veces con el mismo estado no causa problemas
4. **Timestamps**: Se registran automáticamente las fechas de inicio y finalización
5. **Consistencia**: El estado siempre refleja la realidad de los checklists

---

## Diagramas de Flujo

### Flujo al Añadir un Checklist

```
┌────────────────────────────────────┐
│ Usuario añade checklist            │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ Crear AuditChecklist               │
│ status = 'In_Progress'             │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ db.session.commit()                │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ audit.update_status_based_on...() │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ ¿Tiene checklists?                 │
└──┬──────────────────────────────┬──┘
   │ NO                           │ SÍ
   ▼                              ▼
┌─────────────┐         ┌──────────────────┐
│ Created     │         │ ¿Todos           │
└─────────────┘         │ completados?     │
                        └──┬───────────┬───┘
                           │ SÍ        │ NO
                           ▼           ▼
                     ┌───────────┐ ┌──────────────┐
                     │ Completed │ │ In_Progress  │
                     └───────────┘ └──────────────┘
```

---

## Conclusión

Este código proporciona una gestión robusta y automática de los estados de auditorías, eliminando la posibilidad de errores humanos y asegurando la consistencia de los datos en todo momento.
