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
            'assets_count': len(self.assets)
        }
    
    @staticmethod
    def get_valid_statuses():
        return ['Created', 'In_Progress', 'Completed']
    
    def __repr__(self):
        return f'<Audit {self.name}>'