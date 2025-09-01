from app import db
from datetime import datetime

class Activo(db.Model):
    __tablename__ = 'activos'
    
    # Campos principales según PB
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # Hardware, Software, Red
    ubicacion = db.Column(db.String(200))
    estado = db.Column(db.String(20), default='Activo')
    descripcion = db.Column(db.Text)
    
    # Timestamps y auditoría
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    
    # Relación con usuario
    creador = db.relationship('User', backref='activos_creados')
    
    def to_dict(self):
        """Convertir a diccionario para JSON"""
        return {
            'id': self.id,
            'nombre': self.nombre,
            'tipo': self.tipo,
            'ubicacion': self.ubicacion,
            'estado': self.estado,
            'descripcion': self.descripcion,
            'fecha_creacion': self.fecha_creacion.isoformat(),
            'fecha_actualizacion': self.fecha_actualizacion.isoformat(),
            'creado_por': self.creado_por
        }
    
    @staticmethod
    def get_tipos_validos():
        """3 categorías según PB: Hardware, Software, Red"""
        return ['Hardware', 'Software', 'Red']
    
    @staticmethod
    def get_estados_validos():
        return ['Activo', 'Inactivo', 'Mantenimiento']
    
    def __repr__(self):
        return f'<Activo {self.nombre}>'