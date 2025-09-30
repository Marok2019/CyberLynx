from app import db
from app.models.checklist import ChecklistTemplate, ChecklistQuestion

def seed_checklist_templates():
    """Crear 5 módulos básicos de verificación predefinidos"""
    
    templates_data = [
        {
            'name': 'Network Security Baseline',
            'category': 'Network_Security',
            'description': 'Basic network security controls and configurations',
            'questions': [
                {'text': 'Are firewalls properly configured and up to date?', 'order': 1, 'severity': 'Critical'},
                {'text': 'Is network segmentation implemented?', 'order': 2, 'severity': 'High'},
                {'text': 'Are VPNs used for remote access?', 'order': 3, 'severity': 'High'},
                {'text': 'Is wireless network encryption enabled (WPA3/WPA2)?', 'order': 4, 'severity': 'High'},
                {'text': 'Are unused network ports disabled?', 'order': 5, 'severity': 'Medium'},
                {'text': 'Is network traffic monitored and logged?', 'order': 6, 'severity': 'Medium'},
                {'text': 'Are intrusion detection/prevention systems (IDS/IPS) deployed?', 'order': 7, 'severity': 'High'},
                {'text': 'Is DNS filtering implemented?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Access Control & Authentication',
            'category': 'Access_Control',
            'description': 'User access management and authentication mechanisms',
            'questions': [
                {'text': 'Is multi-factor authentication (MFA) enforced for all users?', 'order': 1, 'severity': 'Critical'},
                {'text': 'Are password policies enforced (complexity, length, expiration)?', 'order': 2, 'severity': 'High'},
                {'text': 'Is the principle of least privilege applied to user accounts?', 'order': 3, 'severity': 'Critical'},
                {'text': 'Are privileged accounts properly managed and monitored?', 'order': 4, 'severity': 'Critical'},
                {'text': 'Is there a formal user access review process?', 'order': 5, 'severity': 'High'},
                {'text': 'Are default passwords changed on all systems?', 'order': 6, 'severity': 'Critical'},
                {'text': 'Is account lockout enabled after failed login attempts?', 'order': 7, 'severity': 'Medium'},
                {'text': 'Are user access logs regularly reviewed?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Data Protection & Encryption',
            'category': 'Data_Protection',
            'description': 'Data security controls and encryption standards',
            'questions': [
                {'text': 'Is data at rest encrypted using industry standards (AES-256)?', 'order': 1, 'severity': 'Critical'},
                {'text': 'Is data in transit encrypted (TLS 1.2+)?', 'order': 2, 'severity': 'Critical'},
                {'text': 'Are backups encrypted and tested regularly?', 'order': 3, 'severity': 'High'},
                {'text': 'Is sensitive data classified and labeled?', 'order': 4, 'severity': 'High'},
                {'text': 'Are data retention policies defined and enforced?', 'order': 5, 'severity': 'Medium'},
                {'text': 'Is there a secure data disposal process?', 'order': 6, 'severity': 'High'},
                {'text': 'Are encryption keys properly managed and rotated?', 'order': 7, 'severity': 'Critical'},
                {'text': 'Is data loss prevention (DLP) implemented?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Physical Security Controls',
            'category': 'Physical_Security',
            'description': 'Physical access and environmental controls',
            'questions': [
                {'text': 'Are server rooms and data centers physically secured?', 'order': 1, 'severity': 'High'},
                {'text': 'Is physical access to critical areas logged and monitored?', 'order': 2, 'severity': 'High'},
                {'text': 'Are surveillance cameras installed in critical areas?', 'order': 3, 'severity': 'Medium'},
                {'text': 'Is there environmental monitoring (temperature, humidity)?', 'order': 4, 'severity': 'Medium'},
                {'text': 'Are fire suppression systems installed and tested?', 'order': 5, 'severity': 'High'},
                {'text': 'Is there a visitor management system in place?', 'order': 6, 'severity': 'Low'},
                {'text': 'Are workstations secured with cable locks where appropriate?', 'order': 7, 'severity': 'Low'},
                {'text': 'Is equipment disposal handled securely?', 'order': 8, 'severity': 'Medium'},
            ]
        },
        {
            'name': 'Incident Response & Recovery',
            'category': 'Incident_Response',
            'description': 'Incident handling and business continuity procedures',
            'questions': [
                {'text': 'Is there a documented incident response plan?', 'order': 1, 'severity': 'Critical'},
                {'text': 'Is the incident response team identified and trained?', 'order': 2, 'severity': 'High'},
                {'text': 'Are security incidents logged and tracked?', 'order': 3, 'severity': 'High'},
                {'text': 'Is there a communication plan for security incidents?', 'order': 4, 'severity': 'High'},
                {'text': 'Are incident response drills conducted regularly?', 'order': 5, 'severity': 'Medium'},
                {'text': 'Is there a business continuity plan (BCP)?', 'order': 6, 'severity': 'Critical'},
                {'text': 'Are disaster recovery procedures tested annually?', 'order': 7, 'severity': 'High'},
                {'text': 'Is there a post-incident review process?', 'order': 8, 'severity': 'Medium'},
            ]
        }
    ]
    
    print('🌱 Seeding checklist templates...')
    
    for template_data in templates_data:
        # Verificar si ya existe
        existing = ChecklistTemplate.query.filter_by(name=template_data['name']).first()
        
        if existing:
            print(f'⚠️  Template "{template_data["name"]}" already exists, skipping...')
            continue
        
        # Crear template
        template = ChecklistTemplate(
            name=template_data['name'],
            category=template_data['category'],
            description=template_data['description']
        )
        
        db.session.add(template)
        db.session.flush()  # Para obtener el ID del template
        
        # Crear preguntas
        for question_data in template_data['questions']:
            question = ChecklistQuestion(
                template_id=template.id,
                question_text=question_data['text'],
                order=question_data['order'],
                severity=question_data['severity']
            )
            db.session.add(question)
        
        db.session.commit()
        print(f'✅ Created template: {template_data["name"]} with {len(template_data["questions"])} questions')
    
    print('🎉 Checklist templates seeded successfully!')


if __name__ == '__main__':
    from app import create_app, db
    import os
    
    app = create_app(os.getenv('FLASK_CONFIG') or 'development')
    
    with app.app_context():
        seed_checklist_templates()