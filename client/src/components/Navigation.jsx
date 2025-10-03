import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard,
  Assignment,
  People,
  Approval,
  Settings,
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Navigation = ({ currentView, onViewChange }) => {
  const { user, logout, isAdmin, isHRManager, isEmployee } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const getRoleColor = role => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'hr_manager':
        return 'warning';
      case 'employee':
        return 'info';
      default:
        return 'default';
    }
  };

  const getRoleLabel = role => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'hr_manager':
        return 'RH Manager';
      case 'employee':
        return 'Employé';
      default:
        return role;
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: 'Tableau de bord',
      icon: <Dashboard />,
      show: true,
    },
    {
      key: 'checklists',
      label: 'Checklists',
      icon: <Assignment />,
      show: true,
    },
    {
      key: 'templates',
      label: 'Templates',
      icon: <Assignment />,
      show: isAdmin || isHRManager || isEmployee,
    },
    {
      key: 'approvals',
      label: 'Approbations',
      icon: <Approval />,
      show: isAdmin || isHRManager,
    },
    {
      key: 'users',
      label: 'Utilisateurs',
      icon: <People />,
      show: isAdmin || isHRManager,
    },
    {
      key: 'settings',
      label: 'Paramètres',
      icon: <Settings />,
      show: isAdmin,
    },
  ];

  return (
    <AppBar position='static' elevation={1}>
      <Toolbar>
        <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
          HR Onboarding
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {menuItems
            .filter(item => item.show)
            .map(item => (
              <Button
                key={item.key}
                color='inherit'
                startIcon={item.icon}
                onClick={() => onViewChange(item.key)}
                variant={currentView === item.key ? 'outlined' : 'text'}
                sx={{
                  borderColor: currentView === item.key ? 'white' : 'transparent',
                  backgroundColor:
                    currentView === item.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                {item.label}
              </Button>
            ))}
        </Box>

        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={getRoleLabel(user?.role)}
            color={getRoleColor(user?.role)}
            size='small'
            variant='outlined'
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          />

          <IconButton color='inherit' onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant='subtitle2'>
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {user?.email}
                </Typography>
              </Box>
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={() => {
                handleMenuClose();
                onViewChange('profile');
              }}
            >
              <AccountCircle sx={{ mr: 1 }} />
              Mon Profil
            </MenuItem>

            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Déconnexion
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
