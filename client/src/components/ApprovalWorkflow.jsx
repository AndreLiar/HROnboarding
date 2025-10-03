import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
  LinearProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Visibility,
  ThumbUp,
  ThumbDown,
  Send,
  History
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.PROD
  ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net'
  : 'http://localhost:3001';

const ApprovalWorkflow = () => {
  const { user, hasPermission } = useAuth();
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState([]);
  
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');
  const [changesRequested, setChangesRequested] = useState('');

  const statusFilters = ['pending', 'approved', 'rejected'];
  const currentFilter = statusFilters[tabValue];

  useEffect(() => {
    loadApprovalRequests();
  }, [tabValue]);

  const loadApprovalRequests = async () => {
    try {
      setLoading(true);
      const status = statusFilters[tabValue];
      const response = await axios.get(`${API_BASE}/template-approval/requests?status=${status}&limit=50`);
      setApprovalRequests(response.data.approvalRequests || []);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des demandes d\'approbation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateDetails = async (requestId) => {
    try {
      const response = await axios.get(`${API_BASE}/template-approval/requests/${requestId}`);
      setSelectedTemplate(response.data);
      setViewDialogOpen(true);
    } catch (err) {
      setError('Erreur lors du chargement des détails');
    }
  };

  const loadApprovalHistory = async (templateId) => {
    try {
      const response = await axios.get(`${API_BASE}/template-approval/templates/${templateId}/history`);
      setApprovalHistory(response.data || []);
      setHistoryDialogOpen(true);
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique');
    }
  };

  const handleApproval = async (requestId) => {
    try {
      await axios.post(`${API_BASE}/template-approval/requests/${requestId}/approve`, {
        comments: approvalComments
      });
      
      setSuccess('Template approuvé avec succès');
      setApprovalDialogOpen(false);
      setApprovalComments('');
      loadApprovalRequests();
    } catch (err) {
      setError('Erreur lors de l\'approbation');
    }
  };

  const handleRejection = async (requestId) => {
    try {
      await axios.post(`${API_BASE}/template-approval/requests/${requestId}/reject`, {
        comments: rejectionComments,
        changes_requested: changesRequested
      });
      
      setSuccess('Template rejeté avec succès');
      setRejectionDialogOpen(false);
      setRejectionComments('');
      setChangesRequested('');
      loadApprovalRequests();
    } catch (err) {
      setError('Erreur lors du rejet');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      case 'pending': return <Schedule />;
      default: return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!hasPermission('templates:approve')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Vous n'avez pas les permissions pour accéder aux approbations de templates.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Workflow d'Approbation
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Workflow d'Approbation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="En attente" />
          <Tab label="Approuvés" />
          <Tab label="Rejetés" />
        </Tabs>
      </Box>

      <Grid container spacing={3}>
        {approvalRequests.map((request) => (
          <Grid item xs={12} md={6} lg={4} key={request.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                    {request.template_name}
                  </Typography>
                  
                  <Chip
                    label={getStatusLabel(request.status)}
                    color={getStatusColor(request.status)}
                    size="small"
                    icon={getStatusIcon(request.status)}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {request.template_description || 'Aucune description'}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Demandé par: {request.requested_by_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Catégorie: {request.category_display_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Version: {request.template_version}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Date: {formatDate(request.created_at)}
                  </Typography>
                </Box>

                {request.comments && (
                  <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Commentaires:
                    </Typography>
                    <Typography variant="body2">
                      {request.comments}
                    </Typography>
                  </Box>
                )}

                {request.changes_requested && (
                  <Box sx={{ p: 1, bgcolor: 'error.50', borderRadius: 1, mb: 2 }}>
                    <Typography variant="caption" color="error" display="block">
                      Modifications demandées:
                    </Typography>
                    <Typography variant="body2" color="error">
                      {request.changes_requested}
                    </Typography>
                  </Box>
                )}

                {request.responded_at && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Répondu le: {formatDate(request.responded_at)}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => loadTemplateDetails(request.id)}
                >
                  Voir détails
                </Button>

                <Box>
                  <Button
                    size="small"
                    startIcon={<History />}
                    onClick={() => loadApprovalHistory(request.template_id)}
                  >
                    Historique
                  </Button>

                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="small"
                        color="success"
                        startIcon={<ThumbUp />}
                        onClick={() => {
                          setSelectedTemplate(request);
                          setApprovalDialogOpen(true);
                        }}
                        sx={{ ml: 1 }}
                      >
                        Approuver
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<ThumbDown />}
                        onClick={() => {
                          setSelectedTemplate(request);
                          setRejectionDialogOpen(true);
                        }}
                        sx={{ ml: 1 }}
                      >
                        Rejeter
                      </Button>
                    </>
                  )}
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {approvalRequests.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Aucune demande d'approbation {getStatusLabel(currentFilter).toLowerCase()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentFilter === 'pending' 
              ? 'Toutes les demandes ont été traitées'
              : `Aucune demande ${getStatusLabel(currentFilter).toLowerCase()}`
            }
          </Typography>
        </Box>
      )}

      {/* View Template Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Détails du Template
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTemplate.template_name}
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedTemplate.template_description}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Catégorie
                  </Typography>
                  <Typography variant="body2">
                    {selectedTemplate.category_display_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Version
                  </Typography>
                  <Typography variant="body2">
                    {selectedTemplate.template_version}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Demandé par
                  </Typography>
                  <Typography variant="body2">
                    {selectedTemplate.requested_by_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Date de demande
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedTemplate.created_at)}
                  </Typography>
                </Grid>
              </Grid>

              {selectedTemplate.template_items && selectedTemplate.template_items.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Éléments du template ({selectedTemplate.template_items.length})
                  </Typography>
                  {selectedTemplate.template_items.map((item, index) => (
                    <Card key={item.id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="subtitle2">
                          {index + 1}. {item.title}
                        </Typography>
                        {item.description && (
                          <Typography variant="body2" color="text.secondary">
                            {item.description}
                          </Typography>
                        )}
                        <Box sx={{ mt: 1 }}>
                          <Chip label={item.assignee_role} size="small" sx={{ mr: 1 }} />
                          <Chip label={`Jour ${item.due_days_from_start}`} size="small" variant="outlined" />
                          {item.is_required && (
                            <Chip label="Obligatoire" size="small" color="error" sx={{ ml: 1 }} />
                          )}
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

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approuver le Template</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Vous êtes sur le point d'approuver le template "{selectedTemplate?.template_name}".
          </Typography>
          
          <TextField
            fullWidth
            label="Commentaires (optionnel)"
            multiline
            rows={3}
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            placeholder="Ajoutez des commentaires sur l'approbation..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={() => handleApproval(selectedTemplate?.id)} 
            variant="contained" 
            color="success"
            startIcon={<ThumbUp />}
          >
            Approuver
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rejeter le Template</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Vous êtes sur le point de rejeter le template "{selectedTemplate?.template_name}".
          </Typography>
          
          <TextField
            fullWidth
            label="Raison du rejet"
            multiline
            rows={3}
            value={rejectionComments}
            onChange={(e) => setRejectionComments(e.target.value)}
            placeholder="Expliquez pourquoi le template est rejeté..."
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Modifications demandées"
            multiline
            rows={3}
            value={changesRequested}
            onChange={(e) => setChangesRequested(e.target.value)}
            placeholder="Décrivez les modifications nécessaires pour une future approbation..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={() => handleRejection(selectedTemplate?.id)} 
            variant="contained" 
            color="error"
            startIcon={<ThumbDown />}
            disabled={!rejectionComments.trim()}
          >
            Rejeter
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Historique d'Approbation</DialogTitle>
        <DialogContent>
          <List>
            {approvalHistory.map((entry, index) => (
              <React.Fragment key={entry.id}>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: getStatusColor(entry.status) + '.main', width: 32, height: 32 }}>
                      {getStatusIcon(entry.status)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {getStatusLabel(entry.status)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(entry.created_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Demandé par: {entry.requested_by_name}
                        </Typography>
                        <Typography variant="body2">
                          Traité par: {entry.assigned_to_name}
                        </Typography>
                        {entry.comments && (
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            {entry.comments}
                          </Typography>
                        )}
                        {entry.changes_requested && (
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'error.50', borderRadius: 1 }}>
                            Modifications demandées: {entry.changes_requested}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < approvalHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
          
          {approvalHistory.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Aucun historique d'approbation disponible
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalWorkflow;