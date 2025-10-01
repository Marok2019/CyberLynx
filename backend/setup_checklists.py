#!/usr/bin/env python3
"""
Script to setup checklist tables and seed predefined templates for US-005
"""
import os
import sys
from app import create_app, db
from app.models.checklist import ChecklistTemplate, ChecklistQuestion
from app.seeds.seed_checklists import seed_checklist_templates

def main():
    app = create_app(os.getenv('FLASK_CONFIG') or 'development')

    with app.app_context():
        print('🔍 Checking database tables...')

        # Create all tables if they don't exist
        db.create_all()
        print('✅ Database tables created/verified')

        # Check if templates already exist
        template_count = ChecklistTemplate.query.count()
        print(f'📊 Current checklist templates: {template_count}')

        if template_count == 0:
            print('🌱 Seeding checklist templates...')
            seed_checklist_templates()
        else:
            print('ℹ️  Templates already exist. Skipping seed.')
            print('   To re-seed, delete templates from database first.')

        # Show summary
        print('\n📋 Summary:')
        templates = ChecklistTemplate.query.all()
        for template in templates:
            question_count = template.questions.count()
            print(f'  - {template.name}: {question_count} questions')

        print('\n✅ Setup complete!')

if __name__ == '__main__':
    main()
