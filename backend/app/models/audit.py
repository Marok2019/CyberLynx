from app import db
from datetime import datetime

# Tabla de relación muchos a muchos
audit_assets = db.Table('audit_assets',
    db.Column('audit_id', db.Integer, db.ForeignKey('audits.id'), primary_key=True),
    db.Column('asset_id', db.Integer, db.ForeignKey('assets.id'), primary_key=True)
)

class Audit(db.Model):
    __tablename__ = 'audits'  # ← Plural en inglés
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='Created')  # Created, In_Progress, Completed
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Foreign Key
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    creator = db.relationship('User', backref='created_audits')
    assets = db.relationship('Asset', 
                           secondary=audit_assets, 
                           backref=db.backref('audits', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_by': self.created_by,
            'assets_count': len(self.assets),
            'assigned_assets': [asset.id for asset in self.assets]  # ← AÑADIR: IDs de assets asignados
        }
    
    @staticmethod
    def get_valid_statuses():
        return ['Created', 'In_Progress', 'Completed']

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

    def __repr__(self):
        return f'<Audit {self.name}>'