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
  FileCopy,
  Send,
  MoreVert,
  Visibility,
  Schedule,
  CheckCircle,
  Description,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.PROD
  ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net'
  : 'http://localhost:3001';

const TemplateManagement = () => {
  const { hasPermission, user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, template: null });
  const [tabValue, setTabValue] = useState(0);

  // AI Template Generator state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTemplate, setAiTemplate] = useState(null);
  const [aiFormData, setAiFormData] = useState({
    role: '',
    department: '',
    specific_requirements: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    estimated_duration_minutes: '',
    target_roles: '',
    target_departments: '',
    compliance_frameworks: '',
    tags: '',
    items: [],
  });

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await axios.get(`${API_BASE}/templates?${params}`);
      setTemplates(response.data.templates || []);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/templates/categories`);
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, [loadTemplates, loadCategories]);

  const loadTemplateDetails = async templateId => {
    try {
      const response = await axios.get(`${API_BASE}/templates/${templateId}?includeItems=true`);
      setSelectedTemplate(response.data);
      setViewDialogOpen(true);
    } catch (err) {
      setError('Erreur lors du chargement des détails du template');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const templateData = {
        ...formData,
        target_roles: formData.target_roles
          ? JSON.stringify(formData.target_roles.split(',').map(r => r.trim()))
          : null,
        target_departments: formData.target_departments
          ? JSON.stringify(formData.target_departments.split(',').map(d => d.trim()))
          : null,
        compliance_frameworks: formData.compliance_frameworks
          ? JSON.stringify(formData.compliance_frameworks.split(',').map(c => c.trim()))
          : null,
        estimated_duration_minutes: formData.estimated_duration_minutes
          ? parseInt(formData.estimated_duration_minutes)
          : null,
      };

      await axios.post(`${API_BASE}/templates`, templateData);
      setCreateDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (err) {
      setError('Erreur lors de la création du template');
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      const templateData = {
        ...formData,
        target_roles: formData.target_roles
          ? JSON.stringify(formData.target_roles.split(',').map(r => r.trim()))
          : null,
        target_departments: formData.target_departments
          ? JSON.stringify(formData.target_departments.split(',').map(d => d.trim()))
          : null,
        compliance_frameworks: formData.compliance_frameworks
          ? JSON.stringify(formData.compliance_frameworks.split(',').map(c => c.trim()))
          : null,
        estimated_duration_minutes: formData.estimated_duration_minutes
          ? parseInt(formData.estimated_duration_minutes)
          : null,
      };

      await axios.put(`${API_BASE}/templates/${selectedTemplate.id}`, templateData);
      setEditDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (err) {
      setError('Erreur lors de la mise à jour du template');
    }
  };

  const handleDeleteTemplate = async templateId => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) {
      try {
        await axios.delete(`${API_BASE}/templates/${templateId}`);
        loadTemplates();
      } catch (err) {
        setError('Erreur lors de la suppression du template');
      }
    }
  };

  const handleCloneTemplate = async templateId => {
    try {
      await axios.post(`${API_BASE}/templates/${templateId}/clone`);
      loadTemplates();
      setError('');
    } catch (err) {
      setError('Erreur lors de la duplication du template');
    }
  };

  // Helper function to check if user can edit a template
  const canEditTemplate = template => {
    if (!template || template.status !== 'draft') return false;

    // Admin and HR managers can edit any template
    if (hasPermission('templates:approve')) return true;

    // Employees can edit their own templates
    if (user?.role === 'employee' && template.created_by === user.id) return true;

    // Fallback to general edit permission
    return hasPermission('templates:edit');
  };

  // Helper function to check if user can submit template for approval
  const canSubmitForApproval = template => {
    if (!template || template.status !== 'draft') return false;

    // Admin and HR managers can submit any template
    if (hasPermission('templates:approve')) return true;

    // Employees can submit their own templates
    if (user?.role === 'employee' && template.created_by === user.id) return true;

    // HR managers and admins can submit any template (covered above)
    return hasPermission('templates:edit');
  };

  const handleSubmitForApproval = async templateId => {
    try {
      await axios.post(`${API_BASE}/template-approval/templates/${templateId}/submit`, {
        comments: 'Template soumis pour approbation',
      });
      loadTemplates();
      setError('');
    } catch (err) {
      setError('Erreur lors de la soumission pour approbation');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      estimated_duration_minutes: '',
      target_roles: '',
      target_departments: '',
      compliance_frameworks: '',
      tags: '',
      items: [],
    });
  };

  // AI Template Generator functions
  const generateTemplateWithAI = async () => {
    try {
      setAiGenerating(true);
      setError('');

      const response = await axios.post(`${API_BASE}/template-ai/generate`, {
        role: aiFormData.role,
        department: aiFormData.department,
        specific_requirements: aiFormData.specific_requirements,
        auto_save: false,
      });

      setAiTemplate(response.data.template);
      setError('');
    } catch (err) {
      setError('Erreur lors de la génération IA: ' + (err.response?.data?.details || err.message));
    } finally {
      setAiGenerating(false);
    }
  };

  const saveAITemplate = async () => {
    try {
      setAiGenerating(true);

      const templateData = {
        ...aiTemplate,
        items: aiTemplate.items,
      };

      await axios.post(`${API_BASE}/templates`, templateData);

      setAiDialogOpen(false);
      setAiTemplate(null);
      resetAIForm();
      loadTemplates();
      setError('');
    } catch (err) {
      setError('Erreur lors de la sauvegarde du template IA');
    } finally {
      setAiGenerating(false);
    }
  };

  const resetAIForm = () => {
    setAiFormData({
      role: '',
      department: '',
      specific_requirements: '',
    });
    setAiTemplate(null);
  };

  const openEditDialog = template => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name || '',
      description: template.description || '',
      category: template.category || '',
      estimated_duration_minutes: template.estimated_duration_minutes || '',
      target_roles: template.target_roles ? JSON.parse(template.target_roles).join(', ') : '',
      target_departments: template.target_departments
        ? JSON.parse(template.target_departments).join(', ')
        : '',
      compliance_frameworks: template.compliance_frameworks
        ? JSON.parse(template.compliance_frameworks).join(', ')
        : '',
      tags: template.tags || '',
      items: [],
    });
    setEditDialogOpen(true);
  };

  const getStatusColor = status => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending_approval':
        return 'warning';
      case 'draft':
        return 'info';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'approved':
        return <CheckCircle />;
      case 'pending_approval':
        return <Schedule />;
      case 'draft':
        return <Description />;
      default:
        return null;
    }
  };

  const getStatusLabel = status => {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'pending_approval':
        return 'En attente';
      case 'draft':
        return 'Brouillon';
      case 'archived':
        return 'Archivé';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant='h4' gutterBottom>
          Gestion des Templates
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h4'>Gestion des Templates</Typography>

        {hasPermission('templates:create') && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant='outlined'
              startIcon={<Description />}
              onClick={() => setAiDialogOpen(true)}
              color='secondary'
            >
              🤖 Générer avec l'IA
            </Button>
            <Button
              variant='contained'
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Nouveau Template
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label='Tous' onClick={() => setSelectedStatus('all')} />
          <Tab label='Approuvés' onClick={() => setSelectedStatus('approved')} />
          <Tab label='En attente' onClick={() => setSelectedStatus('pending_approval')} />
          <Tab label='Brouillons' onClick={() => setSelectedStatus('draft')} />
        </Tabs>

        <TextField
          select
          label='Catégorie'
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          size='small'
          sx={{ minWidth: 200 }}
        >
          <MenuItem value='all'>Toutes les catégories</MenuItem>
          {categories.map(category => (
            <MenuItem key={category.id} value={category.name}>
              {category.display_name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {templates.map(template => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
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
                  <Typography variant='h6' component='h3' sx={{ flexGrow: 1 }}>
                    {template.name}
                  </Typography>

                  <IconButton
                    size='small'
                    onClick={e => setActionMenu({ anchorEl: e.currentTarget, template })}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  {template.description || 'Aucune description'}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getStatusLabel(template.status)}
                    color={getStatusColor(template.status)}
                    size='small'
                    icon={getStatusIcon(template.status)}
                    sx={{ mr: 1 }}
                  />

                  <Chip
                    label={template.category_display_name || template.category}
                    variant='outlined'
                    size='small'
                    sx={{
                      backgroundColor: template.category_color + '20',
                      borderColor: template.category_color,
                    }}
                  />
                </Box>

                <Typography variant='caption' color='text.secondary'>
                  Version {template.version} • {template.item_count || 0} éléments
                </Typography>

                {template.estimated_duration_minutes && (
                  <Typography variant='caption' color='text.secondary' display='block'>
                    Durée estimée: {Math.floor(template.estimated_duration_minutes / 60)}h{' '}
                    {template.estimated_duration_minutes % 60}min
                  </Typography>
                )}
              </CardContent>

              <CardActions>
                <Button
                  size='small'
                  startIcon={<Visibility />}
                  onClick={() => loadTemplateDetails(template.id)}
                >
                  Voir
                </Button>

                {canEditTemplate(template) && (
                  <Button
                    size='small'
                    startIcon={<Edit />}
                    onClick={() => openEditDialog(template)}
                  >
                    Modifier
                  </Button>
                )}

                {hasPermission('templates:create') && (
                  <Button
                    size='small'
                    startIcon={<FileCopy />}
                    onClick={() => handleCloneTemplate(template.id)}
                  >
                    Dupliquer
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {templates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant='h6' color='text.secondary'>
            Aucun template trouvé
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {hasPermission('templates:create')
              ? 'Créez votre premier template pour commencer'
              : 'Aucun template disponible pour le moment'}
          </Typography>
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenu.anchorEl}
        open={Boolean(actionMenu.anchorEl)}
        onClose={() => setActionMenu({ anchorEl: null, template: null })}
      >
        {canSubmitForApproval(actionMenu.template) && (
          <MenuItem
            onClick={() => {
              handleSubmitForApproval(actionMenu.template.id);
              setActionMenu({ anchorEl: null, template: null });
            }}
          >
            <Send sx={{ mr: 1 }} />
            Soumettre pour approbation
          </MenuItem>
        )}

        {hasPermission('templates:delete') && (
          <MenuItem
            onClick={() => {
              handleDeleteTemplate(actionMenu.template.id);
              setActionMenu({ anchorEl: null, template: null });
            }}
          >
            <Delete sx={{ mr: 1 }} />
            Supprimer
          </MenuItem>
        )}
      </Menu>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Créer un nouveau template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Nom du template'
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Description'
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label='Catégorie'
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.display_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Durée estimée (minutes)'
                type='number'
                value={formData.estimated_duration_minutes}
                onChange={e =>
                  setFormData({ ...formData, estimated_duration_minutes: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Rôles cibles (séparés par des virgules)'
                value={formData.target_roles}
                onChange={e => setFormData({ ...formData, target_roles: e.target.value })}
                placeholder='employee, manager, contractor'
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Départements cibles (séparés par des virgules)'
                value={formData.target_departments}
                onChange={e => setFormData({ ...formData, target_departments: e.target.value })}
                placeholder='HR, IT, Operations'
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Tags (séparés par des virgules)'
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                placeholder='onboarding, training, compliance'
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateTemplate} variant='contained'>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Modifier le template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Nom du template'
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Description'
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label='Catégorie'
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.display_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Durée estimée (minutes)'
                type='number'
                value={formData.estimated_duration_minutes}
                onChange={e =>
                  setFormData({ ...formData, estimated_duration_minutes: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Tags (séparés par des virgules)'
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                placeholder='onboarding, training, compliance'
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleUpdateTemplate} variant='contained'>
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate?.name}
          <Chip
            label={getStatusLabel(selectedTemplate?.status)}
            color={getStatusColor(selectedTemplate?.status)}
            size='small'
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant='body1' sx={{ mb: 2 }}>
                {selectedTemplate.description}
              </Typography>

              <Typography variant='h6' sx={{ mb: 1 }}>
                Détails
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Catégorie: {selectedTemplate.category_display_name}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Version: {selectedTemplate.version}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Éléments: {selectedTemplate.items?.length || 0}
              </Typography>
              {selectedTemplate.estimated_duration_minutes && (
                <Typography variant='body2' color='text.secondary'>
                  Durée estimée: {Math.floor(selectedTemplate.estimated_duration_minutes / 60)}h{' '}
                  {selectedTemplate.estimated_duration_minutes % 60}min
                </Typography>
              )}

              {selectedTemplate.items && selectedTemplate.items.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant='h6' sx={{ mb: 2 }}>
                    Éléments du template
                  </Typography>
                  {selectedTemplate.items.map((item, index) => (
                    <Card key={item.id} variant='outlined' sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant='subtitle2'>
                          {index + 1}. {item.title}
                        </Typography>
                        {item.description && (
                          <Typography variant='body2' color='text.secondary'>
                            {item.description}
                          </Typography>
                        )}
                        <Box sx={{ mt: 1 }}>
                          <Chip label={item.assignee_role} size='small' sx={{ mr: 1 }} />
                          <Chip
                            label={`Jour ${item.due_days_from_start}`}
                            size='small'
                            variant='outlined'
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* AI Template Generator Dialog */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>🤖 Générateur IA de Templates</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {!aiTemplate ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Rôle du nouvel employé'
                    value={aiFormData.role}
                    onChange={e => setAiFormData({ ...aiFormData, role: e.target.value })}
                    placeholder='ex: Développeur Frontend, Data Scientist, Marketing Manager'
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Département'
                    value={aiFormData.department}
                    onChange={e => setAiFormData({ ...aiFormData, department: e.target.value })}
                    placeholder='ex: IT, R&D, Marketing, HR'
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label='Exigences spécifiques (optionnel)'
                    value={aiFormData.specific_requirements}
                    onChange={e =>
                      setAiFormData({ ...aiFormData, specific_requirements: e.target.value })
                    }
                    placeholder='ex: Formation Python, accès aux données, certification sécurité, outils spécialisés...'
                  />
                </Grid>
              </Grid>
            ) : (
              <Box>
                <Alert severity='success' sx={{ mb: 3 }}>
                  Template généré avec succès ! Vérifiez les détails ci-dessous avant de
                  sauvegarder.
                </Alert>

                <Typography variant='h6' gutterBottom>
                  {aiTemplate.name}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  {aiTemplate.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant='caption' color='text.secondary'>
                    Catégorie: {aiTemplate.category} | Durée estimée:{' '}
                    {Math.round(aiTemplate.estimated_duration_minutes / 60)}h{' '}
                    {aiTemplate.estimated_duration_minutes % 60}min | Éléments:{' '}
                    {aiTemplate.items?.length || 0}
                  </Typography>
                </Box>

                {aiTemplate.items && aiTemplate.items.length > 0 && (
                  <Box>
                    <Typography variant='subtitle2' sx={{ mb: 1 }}>
                      Éléments du template:
                    </Typography>
                    {aiTemplate.items.map((item, index) => (
                      <Card key={index} variant='outlined' sx={{ mb: 1 }}>
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant='subtitle2'>
                            {index + 1}. {item.title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {item.description}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Chip label={item.assignee_role} size='small' sx={{ mr: 1 }} />
                            <Chip
                              label={`Jour ${item.due_days_from_start}`}
                              size='small'
                              variant='outlined'
                              sx={{ mr: 1 }}
                            />
                            <Chip
                              label={`${item.estimated_duration_minutes}min`}
                              size='small'
                              variant='outlined'
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAiDialogOpen(false);
              resetAIForm();
            }}
          >
            Annuler
          </Button>
          {!aiTemplate ? (
            <Button
              onClick={generateTemplateWithAI}
              variant='contained'
              disabled={!aiFormData.role || !aiFormData.department || aiGenerating}
              startIcon={aiGenerating ? <LinearProgress size={20} /> : null}
            >
              {aiGenerating ? 'Génération...' : "Générer avec l'IA"}
            </Button>
          ) : (
            <Button
              onClick={saveAITemplate}
              variant='contained'
              color='success'
              disabled={aiGenerating}
            >
              {aiGenerating ? 'Sauvegarde...' : 'Sauvegarder le Template'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateManagement;
