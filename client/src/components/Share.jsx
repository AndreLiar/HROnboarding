import React, { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material'
import { Share as ShareIcon, ContentCopy, CheckCircle } from '@mui/icons-material'

function Share({ onShare, shareSlug, loading }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = shareSlug ? `${window.location.origin}/c/${shareSlug}` : ''

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Partager la Checklist
      </Typography>

      {!shareSlug ? (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Générez un lien de partage pour cette checklist
          </Typography>
          <Button
            variant="contained"
            onClick={onShare}
            disabled={loading}
            startIcon={<ShareIcon />}
            fullWidth
          >
            {loading ? 'Génération du lien...' : 'Générer le lien de partage'}
          </Button>
        </Box>
      ) : (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            Lien de partage généré avec succès !
          </Alert>
          
          <TextField
            fullWidth
            label="Lien de partage"
            value={shareUrl}
            variant="outlined"
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={copyToClipboard}
                    edge="end"
                    color={copied ? 'success' : 'primary'}
                  >
                    {copied ? <CheckCircle /> : <ContentCopy />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary">
            {copied ? '✓ Lien copié dans le presse-papiers' : 'Cliquez sur l\'icône pour copier le lien'}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

export default Share