import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  CssBaseline, Box, Paper, TextField, Button, Typography,
  AppBar, Toolbar, Tabs, Tab, Alert, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { User } from './types/User';
import AuditChecklistPage from './pages/AuditChecklistPage';
import UsersPage from './pages/UsersPage';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {user ? (
          <AuthenticatedApp user={user} onLogout={handleLogout} />
        ) : (
          <LoginForm onLogin={handleLogin} />
        )}
      </Router>
    </ThemeProvider>
  );
}

const AuthenticatedApp: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabValue = () => {
    if (location.pathname.startsWith('/audits/') && location.pathname.includes('/checklists')) return 2;
    if (location.pathname === '/audits') return 2;
    if (location.pathname === '/assets') return 1;
    if (location.pathname === '/users') return user.role === 'admin' ? 3 : false;
    return 0;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    const paths = user.role === 'admin'
      ? ['/', '/assets', '/audits', '/users']
      : ['/', '/assets', '/audits'];
    navigate(paths[newValue]);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            CyberLynx - Bienvenido {user.name}
          </Typography>
          <Button color="inherit" onClick={onLogout}>
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={getTabValue()} onChange={handleTabChange}>
          <Tab label="Panel Principal" />
          <Tab label="Activos" />
          <Tab label="Auditorías" />
          {user.role === 'admin' && <Tab label="Usuarios" />}
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        <Routes>
          <Route path="/" element={<DashboardContent />} />
          <Route path="/assets" element={<AssetsContent />} />
          <Route path="/audits" element={<AuditsContent />} />
          <Route path="/audits/:auditId/checklists" element={<AuditChecklistPage />} />
          {user.role === 'admin' && <Route path="/users" element={<UsersPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};


// Componente: Contenido del panel principal (US-011)
const DashboardContent: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      const [assetsRes, auditsRes] = await Promise.all([
        fetch('http://127.0.0.1:5000/api/assets', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('http://127.0.0.1:5000/api/audits', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const assetsData = await assetsRes.json();
      const auditsData = await auditsRes.json();

      const assets = assetsData.assets || [];
      const audits = auditsData.audits || [];

      setStats({
        totalAssets: assets.length,
        activeAssets: assets.filter((a: any) => a.status === 'Active').length,
        inactiveAssets: assets.filter((a: any) => a.status === 'Inactive').length,
        maintenanceAssets: assets.filter((a: any) => a.status === 'Maintenance').length,
        hardwareAssets: assets.filter((a: any) => a.type === 'Hardware').length,
        softwareAssets: assets.filter((a: any) => a.type === 'Software').length,
        networkAssets: assets.filter((a: any) => a.type === 'Network').length,
        totalAudits: audits.length,
        createdAudits: audits.filter((a: any) => a.status === 'Created').length,
        inProgressAudits: audits.filter((a: any) => a.status === 'In_Progress').length,
        completedAudits: audits.filter((a: any) => a.status === 'Completed').length,
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Cargando estadísticas...</Typography>
      </Paper>
    );
  }

  if (!stats) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Error al cargar las estadísticas</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Panel Principal
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3, bgcolor: '#e3f2fd', border: '2px solid #1976d2' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Total de Activos
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {stats.totalAssets}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Activos registrados en el sistema
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, bgcolor: '#e8f5e9', border: '2px solid #4caf50' }}>
          <Typography variant="h6" sx={{ color: '#4caf50' }} gutterBottom>
            Auditorías Completadas
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {stats.completedAudits}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            De {stats.totalAudits} auditorías totales
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
          <Typography variant="h6" sx={{ color: '#ff9800' }} gutterBottom>
            Auditorías en Progreso
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {stats.inProgressAudits}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Auditorías activas actualmente
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, bgcolor: '#f3e5f5', border: '2px solid #9c27b0' }}>
          <Typography variant="h6" sx={{ color: '#9c27b0' }} gutterBottom>
            Activos Activos
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {stats.activeAssets}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Operativos y disponibles
          </Typography>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Distribución de Activos por Estado
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Activos</Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.activeAssets} ({Math.round((stats.activeAssets / stats.totalAssets) * 100)}%)
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#e0e0e0', borderRadius: 1, mb: 2 }}>
              <Box sx={{ width: `${(stats.activeAssets / stats.totalAssets) * 100}%`, height: '100%', bgcolor: '#4caf50', borderRadius: 1 }} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Inactivos</Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.inactiveAssets} ({Math.round((stats.inactiveAssets / stats.totalAssets) * 100)}%)
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#e0e0e0', borderRadius: 1, mb: 2 }}>
              <Box sx={{ width: `${(stats.inactiveAssets / stats.totalAssets) * 100}%`, height: '100%', bgcolor: '#f44336', borderRadius: 1 }} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Mantenimiento</Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.maintenanceAssets} ({Math.round((stats.maintenanceAssets / stats.totalAssets) * 100)}%)
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#e0e0e0', borderRadius: 1 }}>
              <Box sx={{ width: `${(stats.maintenanceAssets / stats.totalAssets) * 100}%`, height: '100%', bgcolor: '#ff9800', borderRadius: 1 }} />
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Distribución de Activos por Tipo
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Hardware</Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.hardwareAssets} ({Math.round((stats.hardwareAssets / stats.totalAssets) * 100)}%)
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#e0e0e0', borderRadius: 1, mb: 2 }}>
              <Box sx={{ width: `${(stats.hardwareAssets / stats.totalAssets) * 100}%`, height: '100%', bgcolor: '#1976d2', borderRadius: 1 }} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Software</Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.softwareAssets} ({Math.round((stats.softwareAssets / stats.totalAssets) * 100)}%)
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#e0e0e0', borderRadius: 1, mb: 2 }}>
              <Box sx={{ width: `${(stats.softwareAssets / stats.totalAssets) * 100}%`, height: '100%', bgcolor: '#9c27b0', borderRadius: 1 }} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Red</Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.networkAssets} ({Math.round((stats.networkAssets / stats.totalAssets) * 100)}%)
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#e0e0e0', borderRadius: 1 }}>
              <Box sx={{ width: `${(stats.networkAssets / stats.totalAssets) * 100}%`, height: '100%', bgcolor: '#ff5722', borderRadius: 1 }} />
            </Box>
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Estado de Auditorías
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mt: 2 }}>
          <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Creadas
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">
              {stats.createdAudits}
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              En Progreso
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#ff9800' }}>
              {stats.inProgressAudits}
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Completadas
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#4caf50' }}>
              {stats.completedAudits}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

// Componente: Gestión de activos digitales (US-001, US-002, US-003)
const AssetsContent: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  // Estados para filtros de búsqueda (US-002)
  const [filters, setFilters] = useState({
    name: '',
    type: '',
    status: ''
  });

  // Estado del formulario de creación/edición
  const [formData, setFormData] = useState({
    name: '',
    type: 'Hardware',
    location: '',
    status: 'Active',
    description: ''
  });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.name.trim()) params.append('name', filters.name.trim());
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);

      const url = `http://127.0.0.1:5000/api/assets${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Error cargando activos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    loadAssets();
  };

  const handleClearFilters = () => {
    setFilters({ name: '', type: '', status: '' });
    setTimeout(() => {
      loadAssets();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('El nombre del activo es obligatorio');
      return;
    }

    try {
      const url = editingAsset
        ? `http://127.0.0.1:5000/api/assets/${editingAsset.id}`
        : 'http://127.0.0.1:5000/api/assets';

      const method = editingAsset ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowForm(false);
        setEditingAsset(null);
        setFormData({
          name: '',
          type: 'Hardware',
          location: '',
          status: 'Active',
          description: ''
        });
        loadAssets();
        alert(editingAsset ? 'Activo actualizado exitosamente' : 'Activo creado exitosamente');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al guardar el activo');
      }
    } catch (error) {
      console.error('Error guardando activo:', error);
      alert('Error de conexión');
    }
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      type: asset.type,
      location: asset.location || '',
      status: asset.status,
      description: asset.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (asset: any) => {
    if (window.confirm(`¿Eliminar el activo "${asset.name}"?`)) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/assets/${asset.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          loadAssets();
          alert('Activo eliminado exitosamente');
        } else {
          alert('Error al eliminar el activo');
        }
      } catch (error) {
        console.error('Error eliminando activo:', error);
        alert('Error de conexión');
      }
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestión de Activos</Typography>
        <Button
          variant="contained"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingAsset(null);
              setFormData({
                name: '',
                type: 'Hardware',
                location: '',
                status: 'Active',
                description: ''
              });
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Cancelar' : 'Agregar Activo'}
        </Button>
      </Box>

      {/* Sección de filtros y búsqueda (US-002) */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          🔍 Buscar y Filtrar Activos (US-002)
        </Typography>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 2,
          alignItems: { xs: 'stretch', md: 'flex-end' }
        }}>
          <TextField
            label="Buscar por Nombre"
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            placeholder="Ingrese nombre del activo"
            size="small"
            sx={{ flex: { xs: '1', md: '2' } }}
          />

          <TextField
            label="Filtrar por Tipo"
            select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ flex: 1, minWidth: 150 }}
          >
            <option value="">Todos los Tipos</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network">Red</option>
          </TextField>

          <TextField
            label="Filtrar por Estado"
            select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ flex: 1, minWidth: 150 }}
          >
            <option value="">Todos los Estados</option>
            <option value="Active">Activo</option>
            <option value="Inactive">Inactivo</option>
            <option value="Maintenance">Mantenimiento</option>
          </TextField>
        </Box>

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Button
            variant="contained"
            onClick={handleSearch}
            size="small"
            sx={{ minWidth: 100 }}
          >
            🔍 Buscar
          </Button>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            size="small"
            sx={{ minWidth: 120 }}
          >
            Limpiar Filtros
          </Button>
          <Typography
            variant="caption"
            sx={{
              ml: { xs: 0, sm: 2 },
              mt: { xs: 1, sm: 0 },
              alignSelf: 'center',
              color: 'text.secondary'
            }}
          >
            Encontrados {assets.length} activos
          </Typography>
        </Box>
      </Paper>

      {/* Formulario de creación/edición de activos (US-001, US-003) */}
      {showForm && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            {editingAsset ? `✏️ Editar Activo: ${editingAsset.name}` : '➕ Crear Nuevo Activo (US-001)'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <TextField
                label="Nombre *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                label="Tipo *"
                select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Red</option>
              </TextField>
              <TextField
                label="Ubicación"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <TextField
                label="Estado"
                select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Active">Activo</option>
                <option value="Inactive">Inactivo</option>
                <option value="Maintenance">Mantenimiento</option>
              </TextField>
            </Box>
            <TextField
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
              sx={{ mt: 2 }}
            />
            <Box sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" sx={{ mr: 1 }}>
                {editingAsset ? 'Actualizar Activo' : 'Crear Activo'}
              </Button>
              <Button onClick={() => setShowForm(false)}>Cancelar</Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* Lista de activos con paginación */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Cargando activos...</Typography>
        </Box>
      ) : (
        <Box>
          {assets.length === 0 ? (
            <Alert severity="info">
              {Object.values(filters).some(v => v) ?
                'No se encontraron activos que coincidan con los criterios de búsqueda. Intenta ajustar los filtros.' :
                'No se encontraron activos. ¡Crea tu primer activo!'
              }
            </Alert>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📋 Lista de Activos ({assets.length} elementos)
              </Typography>
              {assets.map((asset) => (
                <Paper key={asset.id} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" color="primary">
                        {asset.name}
                      </Typography>
                      <Typography color="textSecondary">
                        <strong>Tipo:</strong> {asset.type === 'Hardware' ? 'Hardware' : asset.type === 'Software' ? 'Software' : 'Red'} •
                        <strong> Estado:</strong> {asset.status === 'Active' ? 'Activo' : asset.status === 'Inactive' ? 'Inactivo' : 'Mantenimiento'} •
                        <strong> Ubicación:</strong> {asset.location || 'No especificada'}
                      </Typography>
                      {asset.description && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          {asset.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        Creado: {new Date(asset.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        onClick={() => handleEdit(asset)}
                        variant="outlined"
                        size="small"
                      >
                        ✏️ Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(asset)}
                        color="error"
                        variant="outlined"
                        size="small"
                      >
                        🗑️ Eliminar
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </>
          )}
        </Box>
      )}
    </Paper>
  );
};

// Componente: Gestión de auditorías (US-004)
const AuditsContent: React.FC = () => {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAudit, setEditingAudit] = useState<any>(null);

  // Estado del formulario de auditoría
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Created'
  });

  // Activos seleccionados para asignar a la auditoría
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);

  useEffect(() => {
    loadAudits();
    loadAssets();
  }, []);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/audits', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAudits(data.audits || []);
    } catch (error) {
      console.error('Error cargando auditorías:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/assets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Error cargando activos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('El nombre de la auditoría es obligatorio');
      return;
    }

    try {
      const payload = {
        ...formData,
        asset_ids: selectedAssets // Enviar los IDs de activos seleccionados
      };

      console.log('Enviando payload:', payload);

      const url = editingAudit
        ? `http://127.0.0.1:5000/api/audits/${editingAudit.id}`
        : 'http://127.0.0.1:5000/api/audits';

      const method = editingAudit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('Respuesta del servidor:', responseData);

      if (response.ok) {
        setShowForm(false);
        setEditingAudit(null);
        resetForm();
        loadAudits();
        const message = editingAudit
          ? `Auditoría actualizada exitosamente. Activos asignados: ${responseData.assets_assigned || 0}`
          : `Auditoría creada exitosamente. Activos asignados: ${responseData.assets_assigned || 0}`;
        alert(message);
      } else {
        alert(responseData.error || 'Error al guardar la auditoría');
      }
    } catch (error) {
      console.error('Error guardando auditoría:', error);
      alert('Error de conexión');
    }
  };

  const handleEdit = async (audit: any) => {
    setEditingAudit(audit);
    setFormData({
      name: audit.name,
      description: audit.description || '',
      status: audit.status
    });

    // Cargar los activos asignados a esta auditoría
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/audits/${audit.id}/assets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (response.ok && data.assets) {
        const assignedAssetIds = data.assets.map((asset: any) => asset.id);
        setSelectedAssets(assignedAssetIds);
        console.log('Activos asignados cargados:', assignedAssetIds);
      }
    } catch (error) {
      console.error('Error cargando activos de la auditoría:', error);
    }

    setShowForm(true);
  };

  const handleDelete = async (audit: any) => {
    if (window.confirm(`¿Eliminar la auditoría "${audit.name}"?`)) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/audits/${audit.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          loadAudits();
          alert('Auditoría eliminada exitosamente');
        } else {
          alert('Error al eliminar la auditoría');
        }
      } catch (error) {
        console.error('Error eliminando auditoría:', error);
        alert('Error de conexión');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'Created'
    });
    setSelectedAssets([]);
  };

  const handleAssetSelection = (assetId: number) => {
    setSelectedAssets(prev => {
      const newSelection = prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId];

      console.log('Activos seleccionados:', newSelection);
      return newSelection;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Created': return 'info';
      case 'In_Progress': return 'warning';
      case 'Completed': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Created': return 'Creada';
      case 'In_Progress': return 'En Progreso';
      case 'Completed': return 'Completada';
      default: return status;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestión de Auditorías</Typography>
        <Button
          variant="contained"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingAudit(null);
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Cancelar' : 'Crear Nueva Auditoría'}
        </Button>
      </Box>

      {/* Formulario de creación/edición de auditoría (US-004) */}
      {showForm && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#f0f8ff', border: '2px solid #1976d2' }}>
          <Typography variant="h6" gutterBottom>
            {editingAudit ? `✏️ Editar Auditoría: ${editingAudit.name}` : '📋 Crear Nueva Auditoría (US-004)'}
          </Typography>

          <form onSubmit={handleSubmit}>
            {/* Nombre y descripción de la auditoría */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, mb: 2 }}>
              <TextField
                label="Nombre de la Auditoría *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="ej., Auditoría de Seguridad Q1 2024"
              />

              <TextField
                label="Estado"
                select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Created">Creada</option>
                <option value="In_Progress">En Progreso</option>
                <option value="Completed">Completada</option>
              </TextField>
            </Box>

            <TextField
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe los objetivos y alcance de la auditoría"
              sx={{ mb: 3 }}
            />

            {/* Asignar activos a la auditoría */}
            <Typography variant="h6" gutterBottom>
              📦 Asignar Activos a la Auditoría
            </Typography>

            {assets.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No hay activos disponibles. Crea activos primero para asignarlos a las auditorías.
              </Alert>
            ) : (
              <Paper sx={{ p: 2, mb: 3, maxHeight: 200, overflow: 'auto', bgcolor: '#fafafa' }}>
                {assets.map((asset) => (
                  <Box key={asset.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.id)}
                      onChange={() => handleAssetSelection(asset.id)}
                      style={{ marginRight: 8 }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      <strong>{asset.name}</strong> ({asset.type === 'Hardware' ? 'Hardware' : asset.type === 'Software' ? 'Software' : 'Red'}) - {asset.status === 'Active' ? 'Activo' : asset.status === 'Inactive' ? 'Inactivo' : 'Mantenimiento'}
                    </Typography>
                  </Box>
                ))}
                <Typography variant="caption" color="textSecondary">
                  Seleccionados: {selectedAssets.length} activos
                </Typography>
              </Paper>
            )}

            {/* Botones de acción */}
            <Box>
              <Button
                type="submit"
                variant="contained"
                sx={{ mr: 2 }}
                disabled={!formData.name.trim()}
              >
                {editingAudit ? 'Actualizar Auditoría' : 'Crear Auditoría'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowForm(false);
                  setEditingAudit(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* Lista de auditorías */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          📋 Lista de Auditorías ({audits.length} auditorías)
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Cargando auditorías...</Typography>
          </Box>
        ) : audits.length === 0 ? (
          <Alert severity="info">
            No se encontraron auditorías. ¡Crea tu primera auditoría para comenzar las evaluaciones de seguridad!
          </Alert>
        ) : (
          <Box>
            {audits.map((audit) => (
              <Paper
                key={audit.id}
                sx={{
                  p: 3,
                  mb: 2,
                  border: '1px solid #e0e0e0',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" color="primary" sx={{ mr: 2 }}>
                        {audit.name}
                      </Typography>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: getStatusColor(audit.status) === 'info' ? '#e3f2fd' :
                            getStatusColor(audit.status) === 'warning' ? '#fff3e0' : '#e8f5e8',
                          color: getStatusColor(audit.status) === 'info' ? '#1976d2' :
                            getStatusColor(audit.status) === 'warning' ? '#f57c00' : '#388e3c'
                        }}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          {getStatusText(audit.status)}
                        </Typography>
                      </Box>
                    </Box>

                    {audit.description && (
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        {audit.description}
                      </Typography>
                    )}

                    <Typography variant="body2" color="textSecondary">
                      <strong>Activos Asignados:</strong> {audit.assets_count || 0} •{' '}
                      <strong>Creada:</strong> {new Date(audit.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/audits/${audit.id}/checklists`)}
                    >
                      📋 Checklists
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEdit(audit)}
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDelete(audit)}
                    >
                      🗑️ Eliminar
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Paper>
  );
};

// Componente: Formulario de inicio de sesión (US-009)
const LoginForm: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@cyberlynx.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        alert(data.error || 'Error en el inicio de sesión');
      }
    } catch (error) {
      alert('Error de red - Asegúrate de que el backend esté ejecutándose');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f5f5f5"
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          CyberLynx
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" align="center" gutterBottom>
          Sistema de Auditoría de Activos Digitales
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <Typography variant="caption" color="textSecondary" align="center" display="block">
          Las credenciales de demostración están pre-cargadas
        </Typography>
      </Paper>
    </Box>
  );
};

export default App;