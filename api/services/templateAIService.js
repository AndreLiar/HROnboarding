const openai = require('../config/openai');
const { 
  TEMPLATE_SYSTEM_PROMPT, 
  TEMPLATE_ENHANCEMENT_PROMPT,
  TEMPLATE_COMPLIANCE_PROMPT 
} = require('../utils/templatePrompts');

class TemplateAIService {
  /**
   * Generate a complete template with AI
   */
  static async generateTemplate(role, department, specificRequirements = '') {
    if (!openai) {
      throw new Error('OpenAI not configured - cannot generate AI templates');
    }

    try {
      const userPrompt = `
Rôle: ${role}
Département: ${department}
${specificRequirements ? `Exigences spécifiques: ${specificRequirements}` : ''}

Créez un template d'intégration complet et professionnel.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: TEMPLATE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content.trim();
      
      // Parse the JSON response
      const templateData = JSON.parse(response);
      
      // Validate the response structure
      if (!templateData.template || !templateData.template.items || !Array.isArray(templateData.template.items)) {
        throw new Error('Invalid template structure from AI');
      }

      // Ensure sort_order is correct
      templateData.template.items.forEach((item, index) => {
        item.sort_order = index + 1;
      });

      return templateData.template;
    } catch (error) {
      console.error('AI Template Generation Error:', error);
      throw new Error(`Failed to generate template with AI: ${error.message}`);
    }
  }

  /**
   * Enhance an existing template with additional items
   */
  static async enhanceTemplate(existingTemplate, role, department) {
    if (!openai) {
      throw new Error('OpenAI not configured - cannot enhance templates');
    }

    try {
      const userPrompt = `
Template existant:
Nom: ${existingTemplate.name}
Rôle: ${role}
Département: ${department}
Items actuels: ${existingTemplate.items.length}

Items existants:
${existingTemplate.items.map(item => `- ${item.title} (${item.assignee_role}, jour ${item.due_days_from_start})`).join('\n')}

Suggérez des éléments complémentaires essentiels.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: TEMPLATE_ENHANCEMENT_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.6,
      });

      const response = completion.choices[0].message.content.trim();
      const enhancementData = JSON.parse(response);

      return enhancementData.additional_items || [];
    } catch (error) {
      console.error('AI Template Enhancement Error:', error);
      throw new Error(`Failed to enhance template with AI: ${error.message}`);
    }
  }

  /**
   * Check template compliance with French HR regulations
   */
  static async checkCompliance(template) {
    if (!openai) {
      throw new Error('OpenAI not configured - cannot check compliance');
    }

    try {
      const userPrompt = `
Template à vérifier:
Nom: ${template.name}
Description: ${template.description}

Items du template:
${template.items.map(item => 
  `- ${item.title}: ${item.description} (${item.assignee_role}, jour ${item.due_days_from_start})`
).join('\n')}

Vérifiez la conformité réglementaire française.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: TEMPLATE_COMPLIANCE_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content.trim();
      return JSON.parse(response);
    } catch (error) {
      console.error('AI Compliance Check Error:', error);
      throw new Error(`Failed to check compliance with AI: ${error.message}`);
    }
  }

  /**
   * Generate template items suggestions based on role and department
   */
  static async suggestItems(role, department, existingItemCount = 0) {
    if (!openai) {
      return this.getFallbackItems(role, department);
    }

    try {
      const userPrompt = `
Rôle: ${role}
Département: ${department}
Items déjà créés: ${existingItemCount}

Suggérez 3-5 éléments essentiels pour ce template d'intégration.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Vous êtes un expert RH. Suggérez des éléments d\'intégration sous forme JSON avec title, description, category, assignee_role, due_days_from_start, estimated_duration_minutes.' },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content.trim();
      const suggestions = JSON.parse(response);
      
      return Array.isArray(suggestions) ? suggestions : suggestions.items || [];
    } catch (error) {
      console.error('AI Item Suggestion Error:', error);
      return this.getFallbackItems(role, department);
    }
  }

  /**
   * Fallback item suggestions when AI is unavailable
   */
  static getFallbackItems(role, department) {
    const baseItems = [
      {
        title: 'Accueil et présentation de l\'entreprise',
        description: 'Présentation de l\'entreprise, valeurs, et équipe',
        category: 'social',
        assignee_role: 'hr',
        due_days_from_start: 1,
        estimated_duration_minutes: 90,
        is_required: true
      },
      {
        title: 'Formation sécurité et prévention',
        description: 'Formation obligatoire sécurité au travail',
        category: 'compliance',
        assignee_role: 'hr',
        due_days_from_start: 2,
        estimated_duration_minutes: 120,
        is_required: true
      },
      {
        title: 'Configuration des accès systèmes',
        description: 'Création des comptes et accès aux outils',
        category: 'access',
        assignee_role: 'it',
        due_days_from_start: 1,
        estimated_duration_minutes: 60,
        is_required: true
      }
    ];

    // Add role-specific items
    if (role.toLowerCase().includes('développeur') || role.toLowerCase().includes('tech')) {
      baseItems.push({
        title: 'Configuration environnement de développement',
        description: 'Installation et configuration des outils de développement',
        category: 'setup',
        assignee_role: 'developer',
        due_days_from_start: 2,
        estimated_duration_minutes: 180,
        is_required: true
      });
    }

    return baseItems;
  }
}

module.exports = TemplateAIService;