import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import React from 'react';

// Import components that would be part of the main App
import Selector from '../../components/Selector.jsx';
import Checklist from '../../components/Checklist.jsx';
import Share from '../../components/Share.jsx';

// Mock axios for API calls
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Checklist Workflow Integration Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();

    // Setup default axios mock
    mockedAxios.create.mockReturnValue(mockedAxios);
    mockedAxios.defaults = { baseURL: '' };
  });

  describe('Complete Checklist Generation Workflow', () => {
    it('should generate, display, and share a checklist successfully', async () => {
      // Create a test component that properly manages state
      const TestWorkflowComponent = () => {
        const [generatedChecklist, setGeneratedChecklist] = React.useState(null);
        const [checklistMetadata, setChecklistMetadata] = React.useState(null);
        const [loading, setLoading] = React.useState(false);

        const handleGenerate = async (role, department) => {
          setLoading(true);
          try {
            const response = await mockedAxios.post('/api/checklist/generate', {
              role,
              department,
            });
            const {
              checklist,
              role: responseRole,
              department: responseDepartment,
              slug,
            } = response.data.data;

            setGeneratedChecklist(checklist);
            setChecklistMetadata({
              role: responseRole,
              department: responseDepartment,
              slug,
            });
          } finally {
            setLoading(false);
          }
        };

        const handleChange = newChecklist => {
          setGeneratedChecklist(newChecklist);
        };

        const handleShare = async () => {
          return mockedAxios.post('/api/checklist/share', {
            checklist: generatedChecklist,
            ...checklistMetadata,
          });
        };

        return (
          <div>
            <Selector onGenerate={handleGenerate} loading={loading} />
            {generatedChecklist && (
              <>
                <Checklist
                  checklist={generatedChecklist}
                  role={checklistMetadata?.role || ''}
                  department={checklistMetadata?.department || ''}
                  onChange={handleChange}
                />
                <Share onShare={handleShare} shareSlug={null} loading={false} />
              </>
            )}
          </div>
        );
      };

      // Mock API responses
      mockedAxios.post.mockImplementation((url, data) => {
        if (url === '/api/checklist/generate') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                checklist: [
                  { étape: "Accueil et présentation de l'équipe" },
                  { étape: 'Formation aux outils internes' },
                  { étape: "Configuration de l'environnement de travail" },
                ],
                role: data.role,
                department: data.department,
                slug: 'generated-123',
              },
            },
          });
        }
        if (url === '/api/checklist/share') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                slug: 'shared-456',
                shareUrl: 'http://localhost:3000/c/shared-456',
              },
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Render the test component
      render(<TestWorkflowComponent />);

      // Step 1: Generate checklist
      const roleSelect = screen.getByLabelText('Rôle');
      const deptSelect = screen.getByLabelText('Département');

      await user.click(roleSelect);
      await waitFor(() => screen.getByText('Développeur Junior'));
      await user.click(screen.getByText('Développeur Junior'));

      await user.click(deptSelect);
      await waitFor(() => screen.getByText('Informatique'));
      await user.click(screen.getByText('Informatique'));

      const generateButton = screen.getByRole('button', { name: /générer/i });
      await user.click(generateButton);

      // Wait for generation to complete and verify API call was made
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/checklist/generate', {
          role: 'Développeur Junior',
          department: 'Informatique',
        });
      });

      // Step 2: Verify checklist is displayed
      await waitFor(() => {
        expect(screen.getByText("Checklist d'Intégration")).toBeInTheDocument();
        expect(screen.getByText("Accueil et présentation de l'équipe")).toBeInTheDocument();
        expect(screen.getByText('Formation aux outils internes')).toBeInTheDocument();
        expect(screen.getByText("Configuration de l'environnement de travail")).toBeInTheDocument();
      });

      // Step 3: Test checklist editing
      const editButtons = screen.getAllByTestId('EditIcon');
      await user.click(editButtons[0].closest('button'));

      const editInput = screen.getByDisplayValue("Accueil et présentation de l'équipe");
      await user.clear(editInput);
      await user.type(editInput, 'Accueil personnalisé et présentation');

      const saveButton = screen.getByTestId('SaveIcon').closest('button');
      await user.click(saveButton);

      // Verify the edit was applied
      await waitFor(() => {
        expect(screen.getByText('Accueil personnalisé et présentation')).toBeInTheDocument();
      });

      // Step 4: Share the checklist
      const shareButton = screen.getByRole('button', { name: /générer le lien de partage/i });
      await user.click(shareButton);

      // Verify share API call was made
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/checklist/share',
          expect.objectContaining({
            checklist: expect.any(Array),
            role: 'Développeur Junior',
            department: 'Informatique',
          })
        );
      });
    });

    it('should handle API errors gracefully during generation', async () => {
      const mockOnGenerate = vi.fn(() => {
        mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
        return mockedAxios.post('/api/checklist/generate', {});
      });

      render(<Selector onGenerate={mockOnGenerate} loading={false} />);

      // Try to generate with invalid data
      const generateButton = screen.getByRole('button', { name: /générer/i });

      // Button should be disabled initially (no role/department selected)
      expect(generateButton).toBeDisabled();

      // Select role and department
      const roleSelect = screen.getByLabelText('Rôle');
      await user.click(roleSelect);
      await waitFor(() => screen.getByText('Développeur Junior'));
      await user.click(screen.getByText('Développeur Junior'));

      const deptSelect = screen.getByLabelText('Département');
      await user.click(deptSelect);
      await waitFor(() => screen.getByText('Informatique'));
      await user.click(screen.getByText('Informatique'));

      // Now button should be enabled
      expect(generateButton).toBeEnabled();

      // Click and handle error
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalled();
      });

      // API error should be handled gracefully
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('Shared Checklist Viewing', () => {
    it('should load and display a shared checklist', async () => {
      // Mock the API call for fetching shared checklist
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            checklist: [{ étape: 'Shared step 1' }, { étape: 'Shared step 2' }],
            role: 'Shared Role',
            department: 'Shared Department',
            createdAt: new Date().toISOString(),
          },
        },
      });

      // Simulate loading a shared checklist
      const SharedChecklistView = () => {
        const [checklist, setChecklist] = React.useState(null);

        React.useEffect(() => {
          mockedAxios
            .get('/api/checklist/shared/test-slug')
            .then(response => {
              setChecklist(response.data.data);
            })
            .catch(_error => {
              console.error('Failed to load shared checklist:', _error);
            });
        }, []);

        if (!checklist) {
          return <div>Loading...</div>;
        }

        return (
          <Checklist
            checklist={checklist.checklist}
            role={checklist.role}
            department={checklist.department}
            readOnly={true}
          />
        );
      };

      render(<SharedChecklistView />);

      // Initially should show loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Checklist d'Intégration")).toBeInTheDocument();
        expect(screen.getByText('Shared step 1')).toBeInTheDocument();
        expect(screen.getByText('Shared step 2')).toBeInTheDocument();
        expect(screen.getByText('Shared Role')).toBeInTheDocument();
        expect(screen.getByText('Shared Department')).toBeInTheDocument();
      });

      // Verify API call was made
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/checklist/shared/test-slug');

      // Should not show edit controls in readonly mode
      expect(screen.queryByTestId('EditIcon')).not.toBeInTheDocument();
      expect(screen.queryByText('Ajouter un élément')).not.toBeInTheDocument();
    });

    it('should handle shared checklist not found', async () => {
      // Mock 404 response
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Checklist not found',
          },
        },
      });

      const SharedChecklistNotFound = () => {
        const [error, setError] = React.useState(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          mockedAxios
            .get('/api/checklist/shared/non-existent')
            .then(_response => {
              setLoading(false);
            })
            .catch(error => {
              setLoading(false);
              if (error.response?.status === 404) {
                setError('Checklist not found');
              } else {
                setError('Failed to load checklist');
              }
            });
        }, []);

        if (loading) return <div>Loading...</div>;
        if (error) return <div>Error: {error}</div>;

        return <div>Checklist loaded</div>;
      };

      render(<SharedChecklistNotFound />);

      await waitFor(() => {
        expect(screen.getByText('Error: Checklist not found')).toBeInTheDocument();
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/checklist/shared/non-existent');
    });
  });

  describe('Copy to Clipboard Integration', () => {
    beforeEach(() => {
      // Reset clipboard mock for each test - use the same setup as in setup.js
      vi.clearAllMocks();

      // Mock clipboard properly for Vitest
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn(() => Promise.resolve()),
          readText: vi.fn(() => Promise.resolve('mocked clipboard content')),
        },
        writable: true,
      });
    });

    it('should copy share URL to clipboard', async () => {
      const mockShareSlug = 'test-share-123';

      render(<Share onShare={vi.fn()} shareSlug={mockShareSlug} loading={false} />);

      // Should show the generated share URL
      expect(
        screen.getByDisplayValue(`http://localhost:3000/c/${mockShareSlug}`)
      ).toBeInTheDocument();

      // Click copy button
      const copyButton = screen.getByTestId('ContentCopyIcon').closest('button');
      await user.click(copyButton);

      // Verify clipboard was called
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          `http://localhost:3000/c/${mockShareSlug}`
        );
      });

      // Should show success feedback
      await waitFor(() => {
        expect(screen.getByText('✓ Lien copié dans le presse-papiers')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time State Management', () => {
    it('should maintain state consistency across components', async () => {
      let currentChecklist = [{ étape: 'Initial step 1' }, { étape: 'Initial step 2' }];

      const mockOnChange = vi.fn(newChecklist => {
        currentChecklist = newChecklist;
      });

      const { rerender } = render(
        <Checklist
          checklist={currentChecklist}
          role='Test Role'
          department='Test Department'
          onChange={mockOnChange}
        />
      );

      // Add a new item
      const addLink = screen.getByText('Ajouter un élément');
      await user.click(addLink);

      const input = screen.getByPlaceholderText('Nouveau élément...');
      await user.type(input, 'New step');

      const saveButton = screen.getByTestId('SaveIcon').closest('button');
      await user.click(saveButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        { étape: 'Initial step 1' },
        { étape: 'Initial step 2' },
        { étape: 'New step' },
      ]);

      // Re-render with updated state
      rerender(
        <Checklist
          checklist={currentChecklist}
          role='Test Role'
          department='Test Department'
          onChange={mockOnChange}
        />
      );

      // Verify new item is displayed
      await waitFor(() => {
        expect(screen.getByText('New step')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states during API calls', async () => {
      const mockOnGenerate = vi.fn(() => {
        // Simulate slow API response
        return new Promise(resolve => {
          setTimeout(() => {
            mockedAxios.post.mockResolvedValueOnce({
              data: {
                success: true,
                data: {
                  checklist: [{ étape: 'Loaded step' }],
                  role: 'Test Role',
                  department: 'Test Department',
                },
              },
            });
            resolve();
          }, 1000);
        });
      });

      render(<Selector onGenerate={mockOnGenerate} loading={true} />);

      // Should show loading state
      expect(screen.getByText('Génération...')).toBeInTheDocument();

      // Generate button should be disabled during loading
      const generateButton = screen.getByRole('button', { name: /génération/i });
      expect(generateButton).toBeDisabled();
    });

    it('should handle rapid user interactions gracefully', async () => {
      const mockOnShare = vi.fn();

      render(<Share onShare={mockOnShare} shareSlug={null} loading={false} />);

      const generateButton = screen.getByRole('button', { name: /générer le lien de partage/i });

      // Rapidly click the button multiple times
      await user.click(generateButton);
      await user.click(generateButton);
      await user.click(generateButton);

      // Should handle multiple clicks gracefully
      await waitFor(() => {
        expect(mockOnShare).toHaveBeenCalled();
      });
    });
  });
});
