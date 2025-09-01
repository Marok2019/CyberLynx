import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Avatar,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Inventory as AssetsIcon,
    Assessment as AuditsIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types/User';

interface NavbarProps {
    user: User;
    onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
        { label: 'Assets', path: '/assets', icon: <AssetsIcon /> },
        { label: 'Audits', path: '/audits', icon: <AuditsIcon /> },
    ];

    return (
        <AppBar position="fixed">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ mr: 4 }}>
                    CyberLynx
                </Typography>

                <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
                    {menuItems.map((item) => (
                        <Button
                            key={item.path}
                            color="inherit"
                            startIcon={item.icon}
                            onClick={() => navigate(item.path)}
                            sx={{
                                backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                            }}
                        >
                            {item.label}
                        </Button>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                            {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="body2">{user.name}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {user.role}
                            </Typography>
                        </Box>
                    </Box>

                    <Button
                        color="inherit"
                        startIcon={<LogoutIcon />}
                        onClick={onLogout}
                    >
                        Logout
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;