import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Assignment,
  People,
  Approval,
  CheckCircle,
  Warning,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.PROD
  ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net'
  : 'http://localhost:3001';

const Dashboard = ({ onViewChange }) => {
  const { user, isAdmin, isHRManager } = useAuth();
  const [stats, setStats] = useState({
    templates: { total: 0, approved: 0, pending: 0, draft: 0 },
    users: { total: 0, active: 0, pending: 0 },
    approvals: { pending: 0, approved: 0, rejected: 0 },
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get auth token for API calls
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const promises = [];

      // Load templates
      promises.push(
        axios.get(`${API_BASE}/templates?limit=100`, { headers }).then(res => ({
          type: 'templates',
          data: res.data,
        }))
      );

      // Load categories
      promises.push(
        axios.get(`${API_BASE}/templates/categories`, { headers }).then(res => ({
          type: 'categories',
          data: res.data,
        }))
      );

      // Load users (if admin/hr)
      if (isAdmin || isHRManager) {
        promises.push(
          axios.get(`${API_BASE}/users?limit=100`, { headers }).then(res => ({
            type: 'users',
            data: res.data,
          }))
        );

        // Load approval requests
        promises.push(
          axios.get(`${API_BASE}/template-approval/requests?limit=100`, { headers }).then(res => ({
            type: 'approvals',
            data: res.data,
          }))
        );
      }

      const results = await Promise.all(promises);
      const newStats = {
        templates: { total: 0, approved: 0, pending: 0, draft: 0 },
        users: { total: 0, active: 0, pending: 0 },
        approvals: { pending: 0, approved: 0, rejected: 0 },
        categories: [],
      };

      results.forEach(result => {
        switch (result.type) {
          case 'templates': {
            const templates = result.data.templates || [];
            newStats.templates = {
              total: templates.length,
              approved: templates.filter(t => t.status === 'approved').length,
              pending: templates.filter(t => t.status === 'pending_approval').length,
              draft: templates.filter(t => t.status === 'draft').length,
            };
            break;
          }

          case 'categories': {
            newStats.categories = result.data || [];
            break;
          }

          case 'users': {
            const users = result.data.users || [];
            newStats.users = {
              total: users.length,
              active: users.filter(u => u.is_active).length,
              pending: users.filter(u => !u.email_verified).length,
            };
            break;
          }

          case 'approvals': {
            const approvals = result.data.approvalRequests || [];
            newStats.approvals = {
              pending: approvals.filter(a => a.status === 'pending').length,
              approved: approvals.filter(a => a.status === 'approved').length,
              rejected: approvals.filter(a => a.status === 'rejected').length,
            };
            break;
          }
        }
      });

      setStats(newStats);
    } catch (err) {
      console.error('Dashboard loading error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Erreur lors du chargement du tableau de bord';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isHRManager]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const StatCard = ({ title, value, subtitle, color = 'primary', icon, onClick }) => (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        '&:hover': onClick ? { transform: 'translateY(-2px)' } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {icon && <Box sx={{ mr: 1, color: `${color}.main` }}>{icon}</Box>}
          <Typography variant='h6' component='div'>
            {title}
          </Typography>
        </Box>
        <Typography variant='h3' color={`${color}.main`} gutterBottom>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant='h4' gutterBottom>
          Tableau de bord
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h4' gutterBottom>
        Bienvenue, {user?.first_name}!
      </Typography>

      <Typography variant='subtitle1' color='text.secondary' sx={{ mb: 3 }}>
        Vue d'ensemble de votre système HR Onboarding
      </Typography>

      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Template Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title='Templates'
            value={stats.templates.total}
            subtitle={`${stats.templates.approved} approuvés`}
            color='primary'
            icon={<Assignment />}
            onClick={() => onViewChange('templates')}
          />
        </Grid>

        {/* Users Stats (Admin/HR only) */}
        {(isAdmin || isHRManager) && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title='Utilisateurs'
              value={stats.users.total}
              subtitle={`${stats.users.active} actifs`}
              color='success'
              icon={<People />}
              onClick={() => onViewChange('users')}
            />
          </Grid>
        )}

        {/* Approval Stats (Admin/HR only) */}
        {(isAdmin || isHRManager) && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title='En attente'
              value={stats.approvals.pending}
              subtitle='Approbations'
              color='warning'
              icon={<Approval />}
              onClick={() => onViewChange('approvals')}
            />
          </Grid>
        )}

        {/* Categories */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title='Catégories'
            value={stats.categories.length}
            subtitle='Disponibles'
            color='info'
            icon={<TrendingUp />}
          />
        </Grid>

        {/* Template Status Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Statut des Templates
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2'>Approuvés</Typography>
                  <Typography variant='body2'>{stats.templates.approved}</Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={
                    stats.templates.total > 0
                      ? (stats.templates.approved / stats.templates.total) * 100
                      : 0
                  }
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2'>En attente</Typography>
                  <Typography variant='body2'>{stats.templates.pending}</Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={
                    stats.templates.total > 0
                      ? (stats.templates.pending / stats.templates.total) * 100
                      : 0
                  }
                  color='warning'
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2'>Brouillons</Typography>
                  <Typography variant='body2'>{stats.templates.draft}</Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={
                    stats.templates.total > 0
                      ? (stats.templates.draft / stats.templates.total) * 100
                      : 0
                  }
                  color='info'
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Categories Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Catégories de Templates
              </Typography>

              <List dense>
                {stats.categories.map((category, index) => (
                  <React.Fragment key={category.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: category.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant='caption' color='white' sx={{ fontSize: '0.6rem' }}>
                            {category.template_count}
                          </Typography>
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={category.display_name}
                        secondary={`${category.template_count} templates`}
                      />
                    </ListItem>
                    {index < stats.categories.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Actions rapides
              </Typography>

              <Grid container spacing={2}>
                {(isAdmin || isHRManager) && (
                  <>
                    <Grid item>
                      <Button
                        variant='contained'
                        startIcon={<Assignment />}
                        onClick={() => onViewChange('templates')}
                      >
                        Créer Template
                      </Button>
                    </Grid>

                    <Grid item>
                      <Button
                        variant='outlined'
                        startIcon={<People />}
                        onClick={() => onViewChange('users')}
                      >
                        Gérer Utilisateurs
                      </Button>
                    </Grid>
                  </>
                )}

                <Grid item>
                  <Button
                    variant='outlined'
                    startIcon={<CheckCircle />}
                    onClick={() => onViewChange('checklists')}
                  >
                    Voir Checklists
                  </Button>
                </Grid>

                {stats.approvals.pending > 0 && (isAdmin || isHRManager) && (
                  <Grid item>
                    <Button
                      variant='outlined'
                      color='warning'
                      startIcon={<Warning />}
                      onClick={() => onViewChange('approvals')}
                    >
                      {stats.approvals.pending} Approbations en attente
                    </Button>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
