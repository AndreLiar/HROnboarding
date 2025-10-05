import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Selector from '../../components/Selector.jsx';
import Checklist from '../../components/Checklist.jsx';
import Share from '../../components/Share.jsx';

describe('Components Smoke Tests', () => {
  describe('Selector Component', () => {
    it('renders without crashing', () => {
      const mockOnGenerate = vi.fn();
      render(<Selector onGenerate={mockOnGenerate} loading={false} />);
      expect(screen.getAllByText('Rôle')).toHaveLength(2); // Label and legend
      expect(screen.getAllByText('Département')).toHaveLength(2); // Label and legend
    });

    it('shows loading state correctly', () => {
      const mockOnGenerate = vi.fn();
      render(
        <Selector
          onGenerate={mockOnGenerate}
          loading={true}
          initialRole='Développeur Junior'
          initialDepartment='Informatique'
        />
      );
      expect(screen.getByText('Génération...')).toBeInTheDocument();
    });
  });

  describe('Checklist Component', () => {
    const defaultProps = {
      checklist: [{ étape: 'Étape 1' }, { étape: 'Étape 2' }],
      role: 'Développeur Junior',
      department: 'Informatique',
      onChange: vi.fn(),
      readOnly: false,
    };

    it('renders without crashing', () => {
      render(<Checklist {...defaultProps} />);
      expect(screen.getByText("Checklist d'Intégration")).toBeInTheDocument();
      expect(screen.getByText('Étape 1')).toBeInTheDocument();
      expect(screen.getByText('Étape 2')).toBeInTheDocument();
    });

    it('shows role and department chips', () => {
      render(<Checklist {...defaultProps} />);
      expect(screen.getByText('Développeur Junior')).toBeInTheDocument();
      expect(screen.getByText('Informatique')).toBeInTheDocument();
    });

    it('handles readonly mode', () => {
      render(<Checklist {...defaultProps} readOnly={true} />);
      expect(screen.queryByText('Ajouter un élément')).not.toBeInTheDocument();
    });

    it('handles string format checklist', () => {
      const stringChecklist = ['Étape A', 'Étape B'];
      render(<Checklist {...defaultProps} checklist={stringChecklist} />);
      expect(screen.getByText('Étape A')).toBeInTheDocument();
      expect(screen.getByText('Étape B')).toBeInTheDocument();
    });
  });

  describe('Share Component', () => {
    it('renders initial state without crashing', () => {
      const mockOnShare = vi.fn();
      render(<Share onShare={mockOnShare} shareSlug={null} loading={false} />);
      expect(screen.getByText('Partager la Checklist')).toBeInTheDocument();
      expect(
        screen.getByText('Générez un lien de partage pour cette checklist')
      ).toBeInTheDocument();
    });

    it('renders generated state without crashing', () => {
      const mockOnShare = vi.fn();
      render(<Share onShare={mockOnShare} shareSlug='test-slug-123' loading={false} />);
      expect(screen.getByText('Lien de partage généré avec succès !')).toBeInTheDocument();
      expect(screen.getByDisplayValue('http://localhost:3000/c/test-slug-123')).toBeInTheDocument();
    });

    it('shows loading state correctly', () => {
      const mockOnShare = vi.fn();
      render(<Share onShare={mockOnShare} shareSlug={null} loading={true} />);
      expect(screen.getByText('Génération du lien...')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('all components can be rendered together', () => {
      const mockOnGenerate = vi.fn();
      const mockOnChange = vi.fn();
      const mockOnShare = vi.fn();

      const checklist = [{ étape: 'Test étape' }];

      render(
        <div>
          <Selector onGenerate={mockOnGenerate} loading={false} />
          <Checklist
            checklist={checklist}
            role='Test Role'
            department='Test Dept'
            onChange={mockOnChange}
          />
          <Share onShare={mockOnShare} shareSlug={null} loading={false} />
        </div>
      );

      // Verify all components rendered
      expect(screen.getAllByText('Rôle')).toHaveLength(2);
      expect(screen.getByText("Checklist d'Intégration")).toBeInTheDocument();
      expect(screen.getByText('Partager la Checklist')).toBeInTheDocument();
    });
  });
});
