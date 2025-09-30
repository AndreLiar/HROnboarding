import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import { CheckCircle, Edit, Delete, Save, Cancel, Add } from '@mui/icons-material';

function Checklist({ checklist, role, department, onChange }) {
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editText, setEditText] = useState('');
  const [newItem, setNewItem] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  const startEdit = (index, text) => {
    setEditingIndex(index);
    setEditText(typeof text === 'object' ? text.étape : text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      const newChecklist = [...checklist];
      newChecklist[editingIndex] =
        typeof checklist[editingIndex] === 'object' ? { étape: editText.trim() } : editText.trim();
      onChange(newChecklist);
    }
    setEditingIndex(-1);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditText('');
  };

  const deleteItem = index => {
    const newChecklist = checklist.filter((_, i) => i !== index);
    onChange(newChecklist);
  };

  const addNewItem = () => {
    if (newItem.trim()) {
      const newItemFormatted =
        checklist.length > 0 && typeof checklist[0] === 'object'
          ? { étape: newItem.trim() }
          : newItem.trim();
      const newChecklist = [...checklist, newItemFormatted];
      onChange(newChecklist);
      setNewItem('');
      setAddingNew(false);
    }
  };

  const cancelAdd = () => {
    setNewItem('');
    setAddingNew(false);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant='h5' gutterBottom>
          Checklist d'Intégration
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Chip label={role} color='primary' sx={{ mr: 1 }} />
          <Chip label={department} color='secondary' />
        </Box>
        <Divider />
      </Box>

      <List>
        {checklist.map((item, index) => (
          <ListItem key={index} sx={{ px: 0 }}>
            <ListItemIcon>
              <CheckCircle color='action' />
            </ListItemIcon>

            {editingIndex === index ? (
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  variant='outlined'
                  size='small'
                  onKeyPress={e => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
                <IconButton onClick={saveEdit} color='primary' size='small'>
                  <Save />
                </IconButton>
                <IconButton onClick={cancelEdit} size='small'>
                  <Cancel />
                </IconButton>
              </Box>
            ) : (
              <>
                <ListItemText primary={typeof item === 'object' ? item.étape : item} />
                <IconButton onClick={() => startEdit(index, item)} size='small' sx={{ mr: 1 }}>
                  <Edit />
                </IconButton>
                <IconButton onClick={() => deleteItem(index)} size='small' color='error'>
                  <Delete />
                </IconButton>
              </>
            )}
          </ListItem>
        ))}

        {addingNew ? (
          <ListItem sx={{ px: 0 }}>
            <ListItemIcon>
              <CheckCircle color='action' />
            </ListItemIcon>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                placeholder='Nouveau élément...'
                variant='outlined'
                size='small'
                onKeyPress={e => {
                  if (e.key === 'Enter') addNewItem();
                  if (e.key === 'Escape') cancelAdd();
                }}
                autoFocus
              />
              <IconButton onClick={addNewItem} color='primary' size='small'>
                <Save />
              </IconButton>
              <IconButton onClick={cancelAdd} size='small'>
                <Cancel />
              </IconButton>
            </Box>
          </ListItem>
        ) : (
          <ListItem sx={{ px: 0 }}>
            <ListItemIcon>
              <Add color='primary' />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  color='primary'
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setAddingNew(true)}
                >
                  Ajouter un élément
                </Typography>
              }
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
}

export default Checklist;
