from app import db
from datetime import datetime

class ChecklistTemplate(db.Model):
    """Plantillas de checklist con categorías predefinidas"""
    __tablename__ = 'checklist_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # Network, Access_Control, Data_Protection, etc.
    description = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    questions = db.relationship('ChecklistQuestion', backref='template', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'questions_count': self.questions.count()
        }
    
    @staticmethod
    def get_valid_categories():
        return [
            'Network_Security',
            'Access_Control',
            'Data_Protection',
            'Physical_Security',
            'Incident_Response'
        ]
    
    def __repr__(self):
        return f'<ChecklistTemplate {self.name}>'


class ChecklistQuestion(db.Model):
    """Preguntas individuales de cada template"""
    __tablename__ = 'checklist_questions'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('checklist_templates.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    order = db.Column(db.Integer, default=0)  # Para ordenar preguntas
    severity = db.Column(db.String(20), default='Medium')  # Low, Medium, High, Critical
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'template_id': self.template_id,
            'question_text': self.question_text,
            'order': self.order,
            'severity': self.severity,
            'created_at': self.created_at.isoformat()
        }
    
    @staticmethod
    def get_valid_severities():
        return ['Low', 'Medium', 'High', 'Critical']
    
    def __repr__(self):
        return f'<ChecklistQuestion {self.id}>'


class AuditChecklist(db.Model):
    """Instancia de checklist ejecutada en una auditoría"""
    __tablename__ = 'audit_checklists'
    
    id = db.Column(db.Integer, primary_key=True)
    audit_id = db.Column(db.Integer, db.ForeignKey('audits.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('checklist_templates.id'), nullable=False)
    status = db.Column(db.String(20), default='In_Progress')  # In_Progress, Completed
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    # Relationships
    audit = db.relationship('Audit', backref='checklists')
    template = db.relationship('ChecklistTemplate', backref='audit_instances')
    responses = db.relationship('ChecklistResponse', backref='checklist', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'audit_id': self.audit_id,
            'template_id': self.template_id,
            'template_name': self.template.name,
            'status': self.status,
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'total_questions': self.template.questions.count(),
            'answered_questions': self.responses.count(),
            'progress': round((self.responses.count() / self.template.questions.count() * 100), 2) if self.template.questions.count() > 0 else 0
        }
    
    def __repr__(self):
        return f'<AuditChecklist audit={self.audit_id} template={self.template_id}>'


class ChecklistResponse(db.Model):
    """Respuestas individuales a cada pregunta"""
    __tablename__ = 'checklist_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    audit_checklist_id = db.Column(db.Integer, db.ForeignKey('audit_checklists.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('checklist_questions.id'), nullable=False)
    answer = db.Column(db.String(10), nullable=False)  # Yes, No, N/A
    notes = db.Column(db.Text)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow)
    answered_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    question = db.relationship('ChecklistQuestion')
    user = db.relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'audit_checklist_id': self.audit_checklist_id,
            'question_id': self.question_id,
            'question_text': self.question.question_text,
            'severity': self.question.severity,
            'answer': self.answer,
            'notes': self.notes,
            'answered_at': self.answered_at.isoformat(),
            'answered_by': self.answered_by
        }
    
    @staticmethod
    def get_valid_answers():
        return ['Yes', 'No', 'N/A']
    
    def __repr__(self):
        return f'<ChecklistResponse question={self.question_id} answer={self.answer}>'