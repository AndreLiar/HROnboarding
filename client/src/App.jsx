import React, { useState, useEffect } from 'react'
import { Container, Typography, Box, Alert } from '@mui/material'
import Selector from './components/Selector'
import Checklist from './components/Checklist'
import Share from './components/Share'
import axios from 'axios'

const API_BASE = import.meta.env.PROD ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net' : 'http://localhost:3001'

// Debug: Log API base URL
console.log('API_BASE:', API_BASE)
console.log('Environment:', import.meta.env.MODE)

function App() {
  const [checklist, setChecklist] = useState([])
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareSlug, setShareSlug] = useState('')

  // Check if we're viewing a shared checklist
  useEffect(() => {
    const path = window.location.pathname
    const slugMatch = path.match(/^\/c\/([a-zA-Z0-9_-]+)$/)
    
    if (slugMatch) {
      const slug = slugMatch[1]
      loadSharedChecklist(slug)
    }
  }, [])

  const loadSharedChecklist = async (slug) => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/c/${slug}`)
      const { checklist, role, department } = response.data
      setChecklist(checklist)
      setRole(role)
      setDepartment(department)
      setError('')
    } catch (err) {
      setError('Checklist non trouvée ou expirée')
    } finally {
      setLoading(false)
    }
  }

  const generateChecklist = async (selectedRole, selectedDepartment) => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Generating checklist for:', selectedRole, selectedDepartment)
      console.log('API URL:', `${API_BASE}/generate`)
      
      const response = await axios.post(`${API_BASE}/generate`, {
        role: selectedRole,
        department: selectedDepartment
      })
      
      console.log('API Response:', response.data)
      
      setChecklist(response.data.checklist)
      setRole(selectedRole)
      setDepartment(selectedDepartment)
      setShareSlug('')
    } catch (err) {
      console.error('API Error:', err)
      console.error('Error details:', err.response?.data)
      setError(`Erreur lors de la génération de la checklist: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const updateChecklist = (newChecklist) => {
    setChecklist(newChecklist)
    setShareSlug('')
  }

  const shareChecklist = async () => {
    try {
      setLoading(true)
      const response = await axios.post(`${API_BASE}/share`, {
        checklist,
        role,
        department
      })
      
      setShareSlug(response.data.slug)
      setError('')
    } catch (err) {
      setError('Erreur lors du partage de la checklist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          HR Onboarding
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom align="center" color="text.secondary">
          Générateur de Checklist d'Intégration
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
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
            
            <Share 
              onShare={shareChecklist}
              shareSlug={shareSlug}
              loading={loading}
            />
          </>
        )}
      </Box>
    </Container>
  )
}

export default App