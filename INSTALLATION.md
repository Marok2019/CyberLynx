# Guía de Instalación y Configuración - CyberLynx

## Descripción del Proyecto

CyberLynx es una aplicación full-stack para gestión de auditorías de seguridad que incluye:
- **Backend**: Flask (Python) con SQLite
- **Frontend**: React (TypeScript) con Material-UI
- **Base de datos**: SQLite (local)

---

## Requisitos Previos

Asegúrese de tener instalado:
- **Python 3.8 o superior**
- **Node.js 16 o superior** y **npm**
- **Git** (opcional, para clonar el repositorio)

---

## Parte 1: Configuración del Backend

### 1.1 Navegar al directorio del backend

```bash
cd backend
```

### 1.2 Crear entorno virtual de Python

```bash
python -m venv venv
```

### 1.3 Activar el entorno virtual

**En Windows:**
```bash
venv\Scripts\activate
```

**En macOS/Linux:**
```bash
source venv/bin/activate
```

### 1.4 Instalar dependencias

```bash
pip install -r requirements.txt
```

### 1.5 Configurar variables de entorno

El proyecto incluye un archivo `.env` en la raíz del proyecto. Puede dejar los valores por defecto para desarrollo local.

### 1.6 Inicializar la base de datos

Este comando creará:
- La base de datos SQLite (`cyberlynx.db`)
- Todas las tablas necesarias
- Usuario administrador por defecto
- Plantillas de checklists de seguridad

```bash
python run.py
```

El script mostrará:
```
✅ Database tables created
👤 Admin user created: admin@cyberlynx.com / admin123
✅ Checklist templates seeded
🚀 Server started at http://127.0.0.1:5000
```

**Importante:** El servidor quedará corriendo. Mantenga esta terminal abierta.

**Credenciales por defecto:**
- Email: `admin@cyberlynx.com`
- Password: `admin123`

---

## Parte 2: Configuración del Frontend

### 2.1 Abrir una nueva terminal y navegar al directorio frontend

```bash
cd frontend
```

### 2.2 Instalar dependencias de Node.js

```bash
npm install
```

### 2.3 Iniciar el servidor de desarrollo

```bash
npm start
```

El frontend se abrirá automáticamente en `http://localhost:3000`

---

## Parte 3: Verificación de la Instalación

### 3.1 Verificar que ambos servidores están corriendo

- **Backend**: http://127.0.0.1:5000
- **Frontend**: http://localhost:3000

### 3.2 Iniciar sesión

1. Abra el navegador en `http://localhost:3000`
2. Use las credenciales por defecto:
   - Email: `admin@cyberlynx.com`
   - Password: `admin123`

### 3.3 Verificar funcionalidades básicas

- Crear un activo (Assets)
- Crear una auditoría
- Asignar activos a la auditoría
- Iniciar un checklist
- Generar reportes

---

## Estructura de la Base de Datos

La base de datos SQLite se creará automáticamente con las siguientes tablas:

- **users**: Usuarios del sistema
- **assets**: Activos a auditar (servidores, aplicaciones, etc.)
- **audits**: Auditorías de seguridad
- **audit_assets**: Relación muchos-a-muchos entre auditorías y activos
- **checklist_templates**: Plantillas de checklists (predefinidas)
- **checklist_questions**: Preguntas de cada template
- **audit_checklists**: Instancias de checklists ejecutadas en auditorías
- **checklist_responses**: Respuestas a cada pregunta

---

## Comandos Útiles

### Backend

**Iniciar servidor backend:**
```bash
cd backend
python run.py
```

**Recrear base de datos (BORRA TODOS LOS DATOS):**
```bash
cd backend
rm cyberlynx.db
python run.py
```

### Frontend

**Iniciar servidor frontend:**
```bash
cd frontend
npm start
```

**Ejecutar tests:**
```bash
cd frontend
npm test
```

**Generar build de producción:**
```bash
cd frontend
npm run build
```

---

## Solución de Problemas

### Error: "ModuleNotFoundError" en el backend

**Solución:** Asegúrese de haber activado el entorno virtual y instalado las dependencias:
```bash
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install -r requirements.txt
```

### Error: Puerto 5000 o 3000 ya en uso

**Backend (Puerto 5000):**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

**Frontend (Puerto 3000):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Error: "CORS" al llamar al backend

Verifique que el backend esté corriendo en `http://127.0.0.1:5000` y que CORS esté habilitado en `backend/app/__init__.py`

### Frontend no se conecta al backend

Verifique la configuración del proxy en `frontend/package.json`:
```json
"proxy": "http://localhost:5000"
```

---

## Usuarios por Defecto

El sistema crea automáticamente un usuario administrador:

| Email | Password | Role |
|-------|----------|------|
| admin@cyberlynx.com | admin123 | admin |

**Recomendación:** Cambie la contraseña después del primer inicio de sesión.

---

## Tecnologías Utilizadas

### Backend
- Flask 3.1.2
- Flask-SQLAlchemy 3.1.1
- Flask-JWT-Extended 4.7.1
- Flask-CORS 6.0.1
- ReportLab 4.2.5 (generación de PDFs)
- OpenPyXL 3.1.5 (generación de Excel)
- Bcrypt 4.3.0 (encriptación de contraseñas)

### Frontend
- React 19.1.1
- TypeScript 4.9.5
- Material-UI 7.3.1
- React Router DOM 7.8.2
- Axios 1.11.0

---

## Próximos Pasos

1. Cambie las credenciales por defecto
2. Configure las variables de entorno para producción
3. Revise las plantillas de checklists en la base de datos
4. Configure backups periódicos de la base de datos
5. Considere migrar a PostgreSQL para producción

---

## Soporte

Para problemas o preguntas:
1. Revise la sección "Solución de Problemas"
2. Consulte los logs en la consola del backend/frontend
3. Verifique que todas las dependencias estén instaladas correctamente
