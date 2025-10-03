import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import TemplateManagement from './components/TemplateManagement';
import ApprovalWorkflow from './components/ApprovalWorkflow';
import UserManagement from './components/UserManagement';
import Selector from './components/Selector';
import Checklist from './components/Checklist';
import Share from './components/Share';
import axios from 'axios';

const API_BASE = import.meta.env.PROD
  ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net'
  : 'http://localhost:3001';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Debug: Log API base URL
console.log('API_BASE:', API_BASE);
console.log('Environment:', import.meta.env.MODE);

// Main App Component
function AppContent() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [checklist, setChecklist] = useState([]);
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareSlug, setShareSlug] = useState('');
  const [isSharedView, setIsSharedView] = useState(false);

  // Check if we're viewing a shared checklist
  useEffect(() => {
    const path = window.location.pathname;
    const slugMatch = path.match(/^\/c\/([a-zA-Z0-9_-]+)$/);

    if (slugMatch) {
      const slug = slugMatch[1];
      setIsSharedView(true);
      loadSharedChecklist(slug);
    }
  }, []);

  // Show loading during authentication check
  if (authLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  // Show shared checklist view if accessing /c/:slug
  if (isSharedView) {
    return (
      <Container maxWidth='md'>
        <Box sx={{ my: 4 }}>
          <Typography variant='h3' component='h1' gutterBottom align='center'>
            HR Onboarding
          </Typography>
          <Typography
            variant='h6'
            component='h2'
            gutterBottom
            align='center'
            color='text.secondary'
          >
            Checklist Partagée
          </Typography>

          {error && (
            <Alert severity='error' sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {checklist.length > 0 && (
            <Checklist
              checklist={checklist}
              role={role}
              department={department}
              onChange={updateChecklist}
              readOnly={true}
            />
          )}
        </Box>
      </Container>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  const loadSharedChecklist = async slug => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/c/${slug}`);
      const { checklist, role, department } = response.data;
      setChecklist(checklist);
      setRole(role);
      setDepartment(department);
      setError('');
    } catch (err) {
      setError('Checklist non trouvée ou expirée');
    } finally {
      setLoading(false);
    }
  };

  const generateChecklist = async (selectedRole, selectedDepartment) => {
    try {
      setLoading(true);
      setError('');

      console.log('Generating checklist for:', selectedRole, selectedDepartment);
      console.log('API URL:', `${API_BASE}/generate`);

      const response = await axios.post(`${API_BASE}/generate`, {
        role: selectedRole,
        department: selectedDepartment,
      });

      console.log('API Response:', response.data);

      setChecklist(response.data.checklist);
      setRole(selectedRole);
      setDepartment(selectedDepartment);
      setShareSlug('');
    } catch (err) {
      console.error('API Error:', err);
      console.error('Error details:', err.response?.data);
      setError(`Erreur lors de la génération de la checklist: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateChecklist = newChecklist => {
    setChecklist(newChecklist);
    setShareSlug('');
  };

  const shareChecklist = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/share`, {
        checklist,
        role,
        department,
      });

      setShareSlug(response.data.slug);
      setError('');
    } catch (err) {
      setError('Erreur lors du partage de la checklist');
    } finally {
      setLoading(false);
    }
  };

  // Render main authenticated app
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'templates':
        return <TemplateManagement />;
      case 'approvals':
        return <ApprovalWorkflow />;
      case 'users':
        return <UserManagement />;
      case 'checklists':
        return (
          <Container maxWidth='md' sx={{ py: 3 }}>
            <Typography variant='h4' component='h1' gutterBottom>
              Générateur de Checklist
            </Typography>
            <Typography variant='subtitle1' color='text.secondary' sx={{ mb: 3 }}>
              Créez des checklists d'intégration personnalisées avec l'IA
            </Typography>

            {error && (
              <Alert severity='error' sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Selector
              onGenerate={generateChecklist}
              loading={loading}
              initialRole={role}
              initialDepartment={department}
            />

            {checklist.length > 0 && (
              <>
                <Checklist
                  checklist={checklist}
                  role={role}
                  department={department}
                  onChange={updateChecklist}
                />

                <Share onShare={shareChecklist} shareSlug={shareSlug} loading={loading} />
              </>
            )}
          </Container>
        );
      case 'settings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant='h4' gutterBottom>
              Paramètres
            </Typography>
            <Alert severity='info'>Paramètres système - Fonctionnalité à venir</Alert>
          </Box>
        );
      case 'profile':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant='h4' gutterBottom>
              Mon Profil
            </Typography>
            <Alert severity='info'>Gestion du profil utilisateur - Fonctionnalité à venir</Alert>
          </Box>
        );
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <Box component='main' sx={{ flexGrow: 1, bgcolor: 'grey.50' }}>
        {renderCurrentView()}
      </Box>
    </Box>
  );
}

// Main App with Providers
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
