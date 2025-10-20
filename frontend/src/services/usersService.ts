export const usersService = {
    async list(active?: boolean, role?: string) {
        const params = new URLSearchParams();
        if (active !== undefined) params.append('active', String(active));
        if (role && role !== 'todos') params.append('role', role);
        const res = await fetch(`http://127.0.0.1:5000/api/users/?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        return res.json();
    },

    async create(payload: { name: string; email: string; role: 'admin' | 'auditor'; password: string; }) {
        const res = await fetch(`http://127.0.0.1:5000/api/users/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        return res.json().then(data => ({ ok: res.ok, data }));
    },

    async update(id: number, payload: any) {
        const res = await fetch(`http://127.0.0.1:5000/api/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        return res.json().then(data => ({ ok: res.ok, data }));
    },

    async remove(id: number) {
        const res = await fetch(`http://127.0.0.1:5000/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        return res.json().then(data => ({ ok: res.ok, data }));
    }
};