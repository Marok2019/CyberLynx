import React, { useEffect, useState } from 'react';
import { usersService } from '../services/usersService';
import {
    Box, Paper, Typography, Button, TextField, Select, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert, FormControl, InputLabel
} from '@mui/material';

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: 'auditor', password: '' });

    // Filtros
    const [filterActive, setFilterActive] = useState<string>('todos');
    const [filterRole, setFilterRole] = useState<string>('todos');

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        action: null | (() => void);
        message: string;
    }>({ open: false, action: null, message: '' });

    // --- Carga usuarios con filtros ---
    const load = async () => {
        setLoading(true);
        try {
            const estado = filterActive === 'todos' ? undefined : (filterActive === 'activo');
            const rol = filterRole === 'todos' ? undefined : filterRole;
            const res = await usersService.list(estado, rol);
            setUsers(res.users || []);
        } catch {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filterActive, filterRole]);

    const handleCreate = async () => {
        const { ok, data } = await usersService.create(form as any);
        if (ok) {
            setOpen(false);
            setForm({ name: '', email: '', role: 'auditor', password: '' });
            load();
        } else {
            alert(data.error || 'Error al crear usuario');
        }
    };

    const handleToggleActive = (usuario: any) => {
        const activando = !usuario.active;
        const msg = activando
            ? `¿Estás seguro que deseas reactivar al usuario "${usuario.name}"?`
            : `¿Estás seguro que deseas desactivar al usuario "${usuario.name}"?`;
        showConfirm(msg, async () => {
            const { ok, data } = await usersService.update(usuario.id, { active: activando });
            if (ok) load(); else alert(data.error || 'Error al cambiar estado');
        });
    };

    const showConfirm = (msg: string, action: () => void) => {
        setConfirmDialog({ open: true, action, message: msg });
    };

    const handleRemove = (id: number, name: string) => {
        showConfirm(`¿Estás seguro que deseas eliminar permanentemente a "${name}"?`, async () => {
            const { ok, data } = await usersService.remove(id);
            if (ok) load(); else alert(data.error || 'Error');
        });
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Gestión de Usuarios</Typography>
                <Button variant="contained" onClick={() => setOpen(true)}>Crear Usuario</Button>
            </Box>

            {/* FILTROS */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                        label="Estado"
                        value={filterActive}
                        onChange={e => setFilterActive(e.target.value)}
                    >
                        <MenuItem value="todos">Todos</MenuItem>
                        <MenuItem value="activo">Activo</MenuItem>
                        <MenuItem value="inactivo">Inactivo</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Rol</InputLabel>
                    <Select
                        label="Rol"
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                    >
                        <MenuItem value="todos">Todos</MenuItem>
                        <MenuItem value="admin">Administrador</MenuItem>
                        <MenuItem value="auditor">Auditor</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Correo electrónico</TableCell>
                        <TableCell>Rol</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Creado</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map(u => (
                        <TableRow key={u.id}>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                <Chip label={u.role === 'admin' ? 'Administrador' : 'Auditor'} color={u.role === 'admin' ? 'primary' : 'default'} size="small" />
                            </TableCell>
                            <TableCell>
                                <Chip label={u.active ? 'Activo' : 'Inactivo'} color={u.active ? 'success' : 'default'} size="small" />
                            </TableCell>
                            <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                            <TableCell align="right">
                                <Button size="small"
                                    onClick={() => handleToggleActive(u)}
                                    color={u.active ? 'warning' : 'success'}
                                    variant="outlined"
                                >
                                    {u.active ? 'Desactivar' : 'Reactivar'}
                                </Button>
                                <Button size="small" color="error" onClick={() => handleRemove(u.id, u.name)} sx={{ ml: 1 }}>Eliminar</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Crear Usuario</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField label="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth />
                        <TextField label="Correo electrónico" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} fullWidth />
                        <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })} fullWidth>
                            <MenuItem value="auditor">Auditor</MenuItem>
                            <MenuItem value="admin">Administrador</MenuItem>
                        </Select>
                        <TextField label="Contraseña" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} fullWidth />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleCreate}>Crear</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                <DialogTitle>Confirmación</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancelar</Button>
                    <Button
                        color="error"
                        onClick={async () => {
                            setConfirmDialog({ ...confirmDialog, open: false });
                            if (confirmDialog.action) await confirmDialog.action();
                        }}
                    >Confirmar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default UsersPage;