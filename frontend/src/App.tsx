import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  CssBaseline, Box, Paper, TextField, Button, Typography,
  AppBar, Toolbar, Tabs, Tab, Alert, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { User } from './types/User';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    // Verificar si hay usuario guardado
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {user ? (
        <Box sx={{ flexGrow: 1 }}>
          {/* Navigation Bar */}
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                CyberLynx - Welcome {user.name}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Toolbar>
          </AppBar>

          {/* Tab Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Dashboard" />
              <Tab label="Assets" />
              <Tab label="Audits" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {currentTab === 0 && <DashboardContent />}
            {currentTab === 1 && <AssetsContent />}
            {currentTab === 2 && <AuditsContent />}
          </Box>
        </Box>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </ThemeProvider>
  );
}

// Componentes de contenido (temporales)
const DashboardContent: React.FC = () => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Dashboard</Typography>
    <Typography>System overview coming soon...</Typography>
  </Paper>
);

// Reemplaza AssetsContent por esto:
const AssetsContent: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  // Estados para filtros - campos en inglés
  const [filters, setFilters] = useState({
    name: '',
    type: '',
    status: ''
  });

  // Formulario state - campos en inglés
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
      // URL en inglés
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
      setAssets(data.assets || []); // Backend responde con 'assets'
    } catch (error) {
      console.error('Error loading assets:', error);
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

    // Validación en inglés
    if (!formData.name.trim()) {
      alert('Asset name is required');
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
        body: JSON.stringify(formData) // Envía campos en inglés
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
        alert(editingAsset ? 'Asset updated successfully' : 'Asset created successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error saving asset');
      }
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Connection error');
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
    if (window.confirm(`Delete asset "${asset.name}"?`)) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/assets/${asset.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          loadAssets();
          alert('Asset deleted successfully');
        } else {
          alert('Error deleting asset');
        }
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Connection error');
      }
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Assets Management</Typography>
        <Button
          variant="contained"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Asset'}
        </Button>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          🔍 Search & Filter Assets (US-002)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
          <TextField
            label="Search by Name"
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            placeholder="Enter asset name"
            size="small"
          />

          <TextField
            label="Filter by Type"
            select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            SelectProps={{ native: true }}
            size="small"
          >
            <option value="">All Types</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network">Network</option>
          </TextField>

          <TextField
            label="Filter by Status"
            select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            SelectProps={{ native: true }}
            size="small"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Maintenance">Maintenance</option>
          </TextField>
        </Box>

        <Box>
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ mr: 1 }}
            size="small"
          >
            🔍 Search
          </Button>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            size="small"
          >
            Clear Filters
          </Button>
          <Typography variant="caption" sx={{ ml: 2 }}>
            Found {assets.length} assets
          </Typography>
        </Box>
      </Paper>

      {/* Formulario */}
      {showForm && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            {editingAsset ? `✏️ Edit Asset: ${editingAsset.name}` : '➕ Create New Asset (US-001)'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <TextField
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                label="Type *"
                select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
              </TextField>
              <TextField
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <TextField
                label="Status"
                select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
              </TextField>
            </Box>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
              sx={{ mt: 2 }}
            />
            <Box sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" sx={{ mr: 1 }}>
                {editingAsset ? 'Update Asset' : 'Create Asset'}
              </Button>
              <Button onClick={() => setShowForm(false)}>Cancel</Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* Lista de assets */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Loading assets...</Typography>
        </Box>
      ) : (
        <Box>
          {assets.length === 0 ? (
            <Alert severity="info">
              {Object.values(filters).some(v => v) ?
                'No assets match your search criteria. Try adjusting your filters.' :
                'No assets found. Create your first asset!'
              }
            </Alert>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📋 Assets List ({assets.length} items)
              </Typography>
              {assets.map((asset) => (
                <Paper key={asset.id} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" color="primary">
                        {asset.name}
                      </Typography>
                      <Typography color="textSecondary">
                        <strong>Type:</strong> {asset.type} •
                        <strong> Status:</strong> {asset.status} •
                        <strong> Location:</strong> {asset.location || 'Not specified'}
                      </Typography>
                      {asset.description && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          {asset.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        Created: {new Date(asset.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        onClick={() => handleEdit(asset)}
                        variant="outlined"
                        size="small"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(asset)}
                        color="error"
                        variant="outlined"
                        size="small"
                      >
                        🗑️ Delete
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

const AuditsContent: React.FC = () => {
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

  // Assets seleccionados para la auditoría
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);

  useEffect(() => {
    loadAudits();
    loadAssets(); // Para poder asignar assets a auditorías
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
      console.error('Error loading audits:', error);
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
      console.error('Error loading assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación según PB: nombre y descripción
    if (!formData.name.trim()) {
      alert('Audit name is required');
      return;
    }

    try {
      const payload = {
        ...formData,
        asset_ids: selectedAssets // Asignar activos a auditoría
      };

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

      if (response.ok) {
        setShowForm(false);
        setEditingAudit(null);
        resetForm();
        loadAudits();
        alert(editingAudit ? 'Audit updated successfully' : 'Audit created successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error saving audit');
      }
    } catch (error) {
      console.error('Error saving audit:', error);
      alert('Connection error');
    }
  };

  const handleEdit = (audit: any) => {
    setEditingAudit(audit);
    setFormData({
      name: audit.name,
      description: audit.description || '',
      status: audit.status
    });
    setSelectedAssets(audit.assigned_assets || []);
    setShowForm(true);
  };

  const handleDelete = async (audit: any) => {
    if (window.confirm(`Delete audit "${audit.name}"?`)) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/audits/${audit.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          loadAudits();
          alert('Audit deleted successfully');
        } else {
          alert('Error deleting audit');
        }
      } catch (error) {
        console.error('Error deleting audit:', error);
        alert('Connection error');
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
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Created': return 'info';
      case 'In_Progress': return 'warning';
      case 'Completed': return 'success';
      default: return 'default';
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Audits Management</Typography>
        <Button
          variant="contained"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create New Audit'}
        </Button>
      </Box>

      {/* Formulario de auditoría (US-004) */}
      {showForm && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#f0f8ff', border: '2px solid #1976d2' }}>
          <Typography variant="h6" gutterBottom>
            {editingAudit ? `✏️ Edit Audit: ${editingAudit.name}` : '📋 Create New Audit (US-004)'}
          </Typography>

          <form onSubmit={handleSubmit}>
            {/* Nombre y descripción */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, mb: 2 }}>
              <TextField
                label="Audit Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Q1 2024 Security Audit"
              />

              <TextField
                label="Status"
                select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Created">Created</option>
                <option value="In_Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </TextField>
            </Box>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe the audit objectives and scope"
              sx={{ mb: 3 }}
            />

            {/* Asignar activos a auditoría */}
            <Typography variant="h6" gutterBottom>
              📦 Assign Assets to Audit
            </Typography>

            {assets.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No assets available. Create assets first to assign them to audits.
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
                      <strong>{asset.name}</strong> ({asset.type}) - {asset.status}
                    </Typography>
                  </Box>
                ))}
                <Typography variant="caption" color="textSecondary">
                  Selected: {selectedAssets.length} assets
                </Typography>
              </Paper>
            )}

            {/* Botones */}
            <Box>
              <Button
                type="submit"
                variant="contained"
                sx={{ mr: 2 }}
                disabled={!formData.name.trim()}
              >
                {editingAudit ? 'Update Audit' : 'Create Audit'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowForm(false);
                  setEditingAudit(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* Lista de Auditorías */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          📋 Audits List ({audits.length} audits)
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading audits...</Typography>
          </Box>
        ) : audits.length === 0 ? (
          <Alert severity="info">
            No audits found. Create your first audit to begin security assessments!
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
                          {audit.status.replace('_', ' ')}
                        </Typography>
                      </Box>
                    </Box>

                    {audit.description && (
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        {audit.description}
                      </Typography>
                    )}

                    <Typography variant="body2" color="textSecondary">
                      <strong>Assets Assigned:</strong> {audit.assigned_assets?.length || 0} •{' '}
                      <strong>Created:</strong> {new Date(audit.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEdit(audit)}
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDelete(audit)}
                    >
                      🗑️ Delete
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

// Componente de login (sin cambios)
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
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      alert('Network error - Make sure backend is running');
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
          Digital Asset Audit System
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Password"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <Typography variant="caption" color="textSecondary" align="center" display="block">
          Demo credentials are pre-filled
        </Typography>
      </Paper>
    </Box>
  );
};

export default App;