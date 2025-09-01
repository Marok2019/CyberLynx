from app import db
from datetime import datetime

class Asset(db.Model):
    __tablename__ = 'assets'  # ← CAMBIO: plural en inglés
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # Hardware, Software, Network
    location = db.Column(db.String(200))
    status = db.Column(db.String(20), default='Active')
    description = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Key
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    creator = db.relationship('User', backref='created_assets')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'location': self.location,
            'status': self.status,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'created_by': self.created_by
        }
    
    @staticmethod
    def get_valid_types():
        return ['Hardware', 'Software', 'Network']  # ← CAMBIO: Network en lugar de Red
    
    @staticmethod
    def get_valid_statuses():
        return ['Active', 'Inactive', 'Maintenance']
    
    def __repr__(self):
        return f'<Asset {self.name}>'