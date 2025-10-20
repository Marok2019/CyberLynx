from app import db
from app.models.checklist import ChecklistTemplate, ChecklistQuestion

def seed_checklist_templates():
    """Crear 5 módulos básicos de verificación predefinidos en español"""
    
    templates_data = [
        {
            'name': 'Seguridad de Red', # ✅ Tu traducción para el usuario
            'category': 'Network_Security', # ✅ Mi clave interna en inglés
            'description': 'Controles y configuraciones básicas de seguridad de red.',
            'questions': [
                {'text': '¿Están los firewalls configurados correctamente y actualizados?', 'order': 1, 'severity': 'Critical'}, # ✅ Clave de severidad en inglés
                {'text': '¿Se implementa la segmentación de red?', 'order': 2, 'severity': 'High'},
                {'text': '¿Se utilizan VPN para el acceso remoto?', 'order': 3, 'severity': 'High'},
                {'text': '¿Está habilitada la encriptación de la red inalámbrica (WPA3/WPA2)?', 'order': 4, 'severity': 'High'},
                {'text': '¿Están deshabilitados los puertos de red no utilizados?', 'order': 5, 'severity': 'Medium'},
                {'text': '¿Se monitorea y registra el tráfico de red?', 'order': 6, 'severity': 'Medium'},
                {'text': '¿Se han implementado sistemas de detección/preventiva de intrusiones (IDS/IPS)?', 'order': 7, 'severity': 'High'},
                {'text': '¿Se ha implementado el filtrado de DNS?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Control de Acceso y Autenticación',
            'category': 'Access_Control',
            'description': 'Gestión de acceso de usuarios y mecanismos de autenticación.',
            'questions': [
                {'text': '¿Se aplica la autenticación de múltiples factores (MFA) para todos los usuarios?', 'order': 1, 'severity': 'Critical'},
                {'text': '¿Se aplican políticas de contraseñas (complejidad, longitud, expiración)?', 'order': 2, 'severity': 'High'},
                {'text': '¿Se aplica el principio de menor privilegio a las cuentas de usuario?', 'order': 3, 'severity': 'Critical'},
                {'text': '¿Se gestionan y supervisan adecuadamente las cuentas privilegiadas?', 'order': 4, 'severity': 'Critical'},
                {'text': '¿Existe un proceso formal de revisión de acceso de usuarios?', 'order': 5, 'severity': 'High'},
                {'text': '¿Se cambian las contraseñas predeterminadas en todos los sistemas?', 'order': 6, 'severity': 'Critical'},
                {'text': '¿Está habilitada la suspensión de cuentas después de intentos fallidos de inicio de sesión?', 'order': 7, 'severity': 'Medium'},
                {'text': '¿Se revisan regularmente los registros de acceso de usuarios?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Protección de Datos y Cifrado',
            'category': 'Data_Protection',
            'description': 'Controles de seguridad de datos y estándares de cifrado.',
            'questions': [
                {'text': '¿Está cifrada la información en reposo utilizando estándares de la industria (AES-256)?', 'order': 1, 'severity': 'Critical'},
                {'text': '¿Está cifrada la información en tránsito (TLS 1.2+)?', 'order': 2, 'severity': 'Critical'},
                {'text': '¿Se cifran y prueban regularmente las copias de seguridad?', 'order': 3, 'severity': 'High'},
                {'text': '¿Se clasifica y etiqueta la información sensible?', 'order': 4, 'severity': 'High'},
                {'text': '¿Se definen y aplican políticas de retención de datos?', 'order': 5, 'severity': 'Medium'},
                {'text': '¿Existe un proceso seguro de eliminación de datos?', 'order': 6, 'severity': 'High'},
                {'text': '¿Se gestionan y rotan adecuadamente las claves de cifrado?', 'order': 7, 'severity': 'Critical'},
                {'text': '¿Se implementa la prevención de pérdida de datos (DLP)?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Controles de Seguridad Física',
            'category': 'Physical_Security',
            'description': 'Controles de acceso físico y ambiental.',
            'questions': [
                {'text': '¿Están aseguradas físicamente las salas de servidores y los centros de datos?', 'order': 1, 'severity': 'High'},
                {'text': '¿Se registra y supervisa el acceso físico a áreas críticas?', 'order': 2, 'severity': 'High'},
                {'text': '¿Se instalan cámaras de vigilancia en áreas críticas?', 'order': 3, 'severity': 'Medium'},
                {'text': '¿Hay monitoreo ambiental (temperatura, humedad)?', 'order': 4, 'severity': 'Medium'},
                {'text': '¿Se instalan y prueban sistemas de supresión de incendios?', 'order': 5, 'severity': 'High'},
                {'text': '¿Hay un sistema de gestión de visitantes en su lugar?', 'order': 6, 'severity': 'Low'},
                {'text': '¿Se aseguran las estaciones de trabajo con candados de cable donde sea apropiado?', 'order': 7, 'severity': 'Low'},
                {'text': '¿Se maneja la eliminación de equipos de manera segura?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Respuesta a Incidentes y Recuperación',
            'category': 'Incident_Response',
            'description': 'Manejo de incidentes y procedimientos de continuidad del negocio.',
            'questions': [
                {'text': '¿Existe un plan de respuesta a incidentes documentado?', 'order': 1, 'severity': 'Critical'},
                {'text': '¿Está identificado y capacitado el equipo de respuesta a incidentes?', 'order': 2, 'severity': 'High'},
                {'text': '¿Se registran y rastrean los incidentes de seguridad?', 'order': 3, 'severity': 'High'},
                {'text': '¿Existe un plan de comunicación para incidentes de seguridad?', 'order': 4, 'severity': 'High'},
                {'text': '¿Se realizan simulacros de respuesta a incidentes regularmente?', 'order': 5, 'severity': 'Medium'},
                {'text': '¿Hay un plan de continuidad del negocio (BCP)?', 'order': 6, 'severity': 'Critical'},
                {'text': '¿Se prueban anualmente los procedimientos de recuperación ante desastres?', 'order': 7, 'severity': 'High'},
                {'text': '¿Hay un proceso de revisión posterior a incidentes?', 'order': 8, 'severity': 'Medium'},
            ]
        }
    ]
    
    print('🌱 Sembrando plantillas de checklist...')
    
    for template_data in templates_data:
        existing = ChecklistTemplate.query.filter_by(name=template_data['name']).first()
        
        if existing:
            print(f'⚠️  La plantilla "{template_data["name"]}" ya existe, omitiendo...')
            continue
        
        template = ChecklistTemplate(
            name=template_data['name'],
            category=template_data['category'],
            description=template_data['description']
        )
        db.session.add(template)
        db.session.flush()
        
        for question_data in template_data['questions']:
            question = ChecklistQuestion(
                template_id=template.id,
                question_text=question_data['text'],
                order=question_data['order'],
                severity=question_data['severity']
            )
            db.session.add(question)
        
        db.session.commit()
        print(f'✅ Creada plantilla: {template_data["name"]} con {len(template_data["questions"])} preguntas')
    
    print('🎉 Plantillas de checklist sembradas exitosamente!')
