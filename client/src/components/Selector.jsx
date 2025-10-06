import React, { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Button, Grid, Paper } from '@mui/material';
import { Psychology } from '@mui/icons-material';

const ROLES = [
  'Développeur Junior',
  'Développeur Senior',
  'Chef de Projet',
  'Analyste Business',
  'Responsable RH',
  'Assistant RH',
  'Comptable',
  'Contrôleur de Gestion',
  'Commercial',
  'Chargé de Marketing',
  'Designer UI/UX',
  'Administrateur Système',
  'Data Analyst',
  'Chef de Produit',
];

const DEPARTMENTS = [
  'Informatique',
  'Ressources Humaines',
  'Finance',
  'Commercial',
  'Marketing',
  'Operations',
  'Juridique',
  'Direction Générale',
];

function Selector({ onGenerate, loading, initialRole = '', initialDepartment = '' }) {
  const [role, setRole] = useState(initialRole);
  const [department, setDepartment] = useState(initialDepartment);

  const handleGenerate = () => {
    if (role && department) {
      onGenerate(role, department);
    }
  };

  const isDisabled = !role || !department || loading;

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <FormControl fullWidth>
            <InputLabel id='role-select-label'>Rôle</InputLabel>
            <Select
              labelId='role-select-label'
              id='role-select'
              value={role}
              label='Rôle'
              onChange={e => setRole(e.target.value)}
            >
              {ROLES.map(roleOption => (
                <MenuItem key={roleOption} value={roleOption}>
                  {roleOption}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={5}>
          <FormControl fullWidth>
            <InputLabel id='department-select-label'>Département</InputLabel>
            <Select
              labelId='department-select-label'
              id='department-select'
              value={department}
              label='Département'
              onChange={e => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map(deptOption => (
                <MenuItem key={deptOption} value={deptOption}>
                  {deptOption}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={2}>
          <Button
            variant='contained'
            fullWidth
            sx={{ height: '56px' }}
            onClick={handleGenerate}
            disabled={isDisabled}
            startIcon={<Psychology />}
          >
            {loading ? 'Génération...' : 'Générer'}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default Selector;
