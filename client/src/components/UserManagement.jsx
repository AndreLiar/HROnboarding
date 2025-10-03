import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Avatar,
  IconButton,
  Menu,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Person,
  Lock,
  LockOpen,
  AdminPanelSettings,
  Group,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.PROD
  ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net'
  : 'http://localhost:3001';

const UserManagement = () => {
  const { user, hasPermission, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, user: null });
  const [tabValue, setTabValue] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'employee',
  });

  const roleFilters = ['all', 'admin', 'hr_manager', 'employee'];
  const currentFilter = roleFilters[tabValue];

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (currentFilter !== 'all') {
        params.append('role', currentFilter);
      }

      const response = await axios.get(`${API_BASE}/users?${params}&limit=100`);
      setUsers(response.data.users || []);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async () => {
    try {
      await axios.post(`${API_BASE}/users`, formData);
      setSuccess('Utilisateur créé avec succès');
      setCreateDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la création de l'utilisateur");
    }
  };

  const handleUpdateUser = async () => {
    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password; // Don't update password if not provided
      }

      await axios.put(`${API_BASE}/users/${selectedUser.id}`, updateData);
      setSuccess('Utilisateur mis à jour avec succès');
      setEditDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/users/${userId}`, {
        is_active: !currentStatus,
      });
      setSuccess(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      loadUsers();
    } catch (err) {
      setError('Erreur lors du changement de statut');
    }
  };

  const handleDeleteUser = async userId => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await axios.delete(`${API_BASE}/users/${userId}`);
        setSuccess('Utilisateur supprimé avec succès');
        loadUsers();
      } catch (err) {
        setError('Erreur lors de la suppression');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'employee',
    });
  };

  const openEditDialog = userToEdit => {
    setSelectedUser(userToEdit);
    setFormData({
      email: userToEdit.email || '',
      password: '', // Always empty for security
      first_name: userToEdit.first_name || '',
      last_name: userToEdit.last_name || '',
      role: userToEdit.role || 'employee',
    });
    setEditDialogOpen(true);
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

  const getRoleIcon = role => {
    switch (role) {
      case 'admin':
        return <AdminPanelSettings />;
      case 'hr_manager':
        return <Business />;
      case 'employee':
        return <Group />;
      default:
        return <Person />;
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!hasPermission('users:read:all')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='warning'>
          Vous n'avez pas les permissions pour gérer les utilisateurs.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant='h4' gutterBottom>
          Gestion des Utilisateurs
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h4'>Gestion des Utilisateurs</Typography>

        {hasPermission('users:create') && (
          <Button variant='contained' startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Nouvel Utilisateur
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Role Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label='Tous' />
          <Tab label='Administrateurs' />
          <Tab label='RH Managers' />
          <Tab label='Employés' />
        </Tabs>
      </Box>

      {/* Users List */}
      <Grid container spacing={3}>
        {users.map(userItem => (
          <Grid item xs={12} sm={6} md={4} key={userItem.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <Avatar sx={{ mr: 2, bgcolor: getRoleColor(userItem.role) + '.main' }}>
                      {userItem.first_name?.[0]}
                      {userItem.last_name?.[0]}
                    </Avatar>

                    <Box>
                      <Typography variant='h6' component='h3'>
                        {userItem.first_name} {userItem.last_name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {userItem.email}
                      </Typography>
                    </Box>
                  </Box>

                  <IconButton
                    size='small'
                    onClick={e => setActionMenu({ anchorEl: e.currentTarget, user: userItem })}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getRoleLabel(userItem.role)}
                    color={getRoleColor(userItem.role)}
                    size='small'
                    icon={getRoleIcon(userItem.role)}
                    sx={{ mr: 1 }}
                  />

                  <Chip
                    label={userItem.is_active ? 'Actif' : 'Inactif'}
                    color={userItem.is_active ? 'success' : 'default'}
                    size='small'
                    variant='outlined'
                    sx={{ mr: 1 }}
                  />

                  {!userItem.email_verified && (
                    <Chip label='Non vérifié' color='warning' size='small' variant='outlined' />
                  )}
                </Box>

                <Typography variant='caption' color='text.secondary' display='block'>
                  Créé le: {formatDate(userItem.created_at)}
                </Typography>

                {userItem.last_login && (
                  <Typography variant='caption' color='text.secondary' display='block'>
                    Dernière connexion: {formatDate(userItem.last_login)}
                  </Typography>
                )}
              </CardContent>

              <CardActions>
                {hasPermission('users:update:all') && (
                  <Button
                    size='small'
                    startIcon={<Edit />}
                    onClick={() => openEditDialog(userItem)}
                  >
                    Modifier
                  </Button>
                )}

                {hasPermission('users:update:all') && (
                  <Button
                    size='small'
                    startIcon={userItem.is_active ? <Lock /> : <LockOpen />}
                    onClick={() => handleToggleUserStatus(userItem.id, userItem.is_active)}
                    color={userItem.is_active ? 'warning' : 'success'}
                  >
                    {userItem.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {users.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant='h6' color='text.secondary'>
            Aucun utilisateur trouvé
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {currentFilter === 'all'
              ? 'Aucun utilisateur dans le système'
              : `Aucun ${getRoleLabel(currentFilter).toLowerCase()} trouvé`}
          </Typography>
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenu.anchorEl}
        open={Boolean(actionMenu.anchorEl)}
        onClose={() => setActionMenu({ anchorEl: null, user: null })}
      >
        {hasPermission('users:update:all') && (
          <MenuItem
            onClick={() => {
              openEditDialog(actionMenu.user);
              setActionMenu({ anchorEl: null, user: null });
            }}
          >
            <Edit sx={{ mr: 1 }} />
            Modifier
          </MenuItem>
        )}

        {hasPermission('users:delete') && actionMenu.user?.id !== user?.id && isAdmin && (
          <MenuItem
            onClick={() => {
              handleDeleteUser(actionMenu.user.id);
              setActionMenu({ anchorEl: null, user: null });
            }}
          >
            <Delete sx={{ mr: 1 }} />
            Supprimer
          </MenuItem>
        )}
      </Menu>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Email'
                type='email'
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Mot de passe'
                type='password'
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label='Prénom'
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label='Nom'
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label='Rôle'
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <MenuItem value='employee'>Employé</MenuItem>
                <MenuItem value='hr_manager'>RH Manager</MenuItem>
                {isAdmin && <MenuItem value='admin'>Administrateur</MenuItem>}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateUser} variant='contained'>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Modifier l'utilisateur</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Email'
                type='email'
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Nouveau mot de passe (optionnel)'
                type='password'
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                helperText='Laissez vide pour ne pas changer le mot de passe'
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label='Prénom'
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label='Nom'
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label='Rôle'
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                required
                disabled={selectedUser?.id === user?.id} // Can't change own role
              >
                <MenuItem value='employee'>Employé</MenuItem>
                <MenuItem value='hr_manager'>RH Manager</MenuItem>
                {isAdmin && <MenuItem value='admin'>Administrateur</MenuItem>}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleUpdateUser} variant='contained'>
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
