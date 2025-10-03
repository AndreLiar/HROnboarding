import React, { useState } from 'react';
import {
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleDemoLogin = async demoType => {
    setLoading(true);
    setError('');

    let demoCredentials;
    switch (demoType) {
      case 'admin':
        demoCredentials = { email: 'admin@hr-onboarding.com', password: 'AdminPassword123!' };
        break;
      default:
        demoCredentials = { email: 'admin@hr-onboarding.com', password: 'AdminPassword123!' };
    }

    const result = await login(demoCredentials.email, demoCredentials.password);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant='h4' component='h1' gutterBottom color='primary'>
            HR Onboarding
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Système de Gestion d'Intégration
          </Typography>
        </Box>

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label='Email'
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            margin='normal'
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label='Mot de passe'
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            margin='normal'
            required
            disabled={loading}
          />

          <Button
            type='submit'
            fullWidth
            variant='contained'
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
            size='large'
          >
            {loading ? <CircularProgress size={24} /> : 'Se connecter'}
          </Button>
        </form>

        <Divider sx={{ my: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            Ou utilisez un compte de démonstration
          </Typography>
        </Divider>

        <Card variant='outlined' sx={{ mt: 2 }}>
          <CardContent sx={{ pt: 2, pb: '16px !important' }}>
            <Typography variant='subtitle2' gutterBottom>
              Comptes de démonstration:
            </Typography>

            <Button
              fullWidth
              variant='outlined'
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              sx={{ mb: 1 }}
              size='small'
            >
              Admin Système
            </Button>

            <Typography variant='caption' display='block' color='text.secondary' sx={{ mt: 1 }}>
              admin@hr-onboarding.com
            </Typography>
          </CardContent>
        </Card>

        <Typography variant='body2' color='text.secondary' sx={{ mt: 2, textAlign: 'center' }}>
          Système d'intégration avec gestion de templates, workflow d'approbation, et IA
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;
