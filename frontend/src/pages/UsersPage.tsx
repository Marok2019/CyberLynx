import React, { useEffect, useState } from 'react';
import { usersService } from '../services/usersService';
import {
    Box, Paper, Typography, Button, TextField, Select, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert
} from '@mui/material';

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: 'auditor', password: '' });

    const load = async () => {
        setLoading(true);
        try {
            const res = await usersService.list();
            setUsers(res.users || []);
        } catch (e: any) {
            setError('Error loading users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        const { ok, data } = await usersService.create(form as any);
        if (ok) {
            setOpen(false);
            setForm({ name: '', email: '', role: 'auditor', password: '' });
            load();
        } else {
            alert(data.error || 'Error creating user');
        }
    };

    const handleRemove = async (id: number) => {
        if (!confirm('Delete this user permanently?')) return;
        const { ok, data } = await usersService.remove(id);
        if (ok) load(); else alert(data.error || 'Error');
    };

    const handleDeactivate = async (id: number) => {
        if (!confirm('Deactivate this user?')) return;
        const { ok, data } = await usersService.update(id, { active: false });
        if (ok) load(); else alert(data.error || 'Error');
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">User Management</Typography>
                <Button variant="contained" onClick={() => setOpen(true)}>Create User</Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map(u => (
                        <TableRow key={u.id}>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                <Chip label={u.role} color={u.role === 'admin' ? 'primary' : 'default'} size="small" />
                            </TableCell>
                            <TableCell>
                                <Chip label={u.active ? 'Active' : 'Inactive'} color={u.active ? 'success' : 'default'} size="small" />
                            </TableCell>
                            <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                            <TableCell align="right">
                                <Button size="small" onClick={() => handleDeactivate(u.id)} disabled={!u.active}>Deactivate</Button>
                                <Button size="small" color="error" onClick={() => handleRemove(u.id)}>Delete</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create User</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth />
                        <TextField label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} fullWidth />
                        <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })} fullWidth>
                            <MenuItem value="auditor">auditor</MenuItem>
                            <MenuItem value="admin">admin</MenuItem>
                        </Select>
                        <TextField label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} fullWidth />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate}>Create</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default UsersPage;