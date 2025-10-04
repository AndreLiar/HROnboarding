const TemplateAIService = require('../services/templateAIService');
const { v4: uuidv4 } = require('uuid');
const sql = require('mssql');

class TemplateAIController {
  /**
   * Generate a complete template using AI
   */
  static async generateTemplate(req, res) {
    try {
      const { role, department, specific_requirements, auto_save = false } = req.body;
      const userId = req.user.id;

      if (!role || !department) {
        return res.status(400).json({
          error: 'Role and department are required'
        });
      }

      console.log(`🤖 Generating AI template for role: ${role}, department: ${department}`);

      // Generate template with AI
      const aiTemplate = await TemplateAIService.generateTemplate(
        role, 
        department, 
        specific_requirements
      );

      if (auto_save) {
        // Save the template directly to database
        const templateId = uuidv4();
        const request = new sql.Request();

        // Create template
        await request
          .input('id', templateId)
          .input('name', aiTemplate.name)
          .input('description', aiTemplate.description)
          .input('category', aiTemplate.category)
          .input('template_data', '{}')
          .input('tags', aiTemplate.tags)
          .input('estimated_duration_minutes', aiTemplate.estimated_duration_minutes)
          .input('target_roles', JSON.stringify(aiTemplate.target_roles))
          .input('target_departments', JSON.stringify(aiTemplate.target_departments))
          .input('created_by', userId)
          .query(`
            INSERT INTO ChecklistTemplates (
              id, name, description, category, template_data, tags,
              estimated_duration_minutes, target_roles, target_departments,
              created_by, status
            ) VALUES (
              @id, @name, @description, @category, @template_data, @tags,
              @estimated_duration_minutes, @target_roles, @target_departments,
              @created_by, 'draft'
            )
          `);

        // Create template items
        for (let i = 0; i < aiTemplate.items.length; i++) {
          const item = aiTemplate.items[i];
          await request
            .input(`item_id_${i}`, uuidv4())
            .input(`item_template_id_${i}`, templateId)
            .input(`item_title_${i}`, item.title)
            .input(`item_description_${i}`, item.description)
            .input(`item_category_${i}`, item.category)
            .input(`item_is_required_${i}`, item.is_required !== false)
            .input(`item_estimated_duration_${i}`, item.estimated_duration_minutes)
            .input(`item_sort_order_${i}`, item.sort_order)
            .input(`item_assignee_role_${i}`, item.assignee_role)
            .input(`item_due_days_${i}`, item.due_days_from_start)
            .query(`
              INSERT INTO TemplateItems (
                id, template_id, title, description, category, is_required,
                estimated_duration_minutes, sort_order, assignee_role,
                due_days_from_start, attachments_required, approval_required
              ) VALUES (
                @item_id_${i}, @item_template_id_${i}, @item_title_${i}, @item_description_${i},
                @item_category_${i}, @item_is_required_${i}, @item_estimated_duration_${i},
                @item_sort_order_${i}, @item_assignee_role_${i}, @item_due_days_${i}, 0, 0
              )
            `);
        }

        res.status(201).json({
          message: 'AI template generated and saved successfully',
          template: { ...aiTemplate, id: templateId, status: 'draft' },
          generated_by: 'AI',
          saved: true
        });
      } else {
        // Just return the generated template for preview
        res.json({
          message: 'AI template generated successfully',
          template: aiTemplate,
          generated_by: 'AI',
          saved: false
        });
      }
    } catch (error) {
      console.error('Error generating AI template:', error);
      res.status(500).json({
        error: 'Failed to generate template with AI',
        details: error.message,
        fallback_available: true
      });
    }
  }

  /**
   * Enhance an existing template with AI suggestions
   */
  static async enhanceTemplate(req, res) {
    try {
      const { id } = req.params;
      const { role, department } = req.body;

      // Get existing template
      const request = new sql.Request();
      request.input('templateId', id);

      const templateResult = await request.query(`
        SELECT * FROM ChecklistTemplates WHERE id = @templateId
      `);

      if (templateResult.recordset.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const template = templateResult.recordset[0];

      // Get existing items
      const itemsResult = await request.query(`
        SELECT * FROM TemplateItems 
        WHERE template_id = @templateId 
        ORDER BY sort_order
      `);

      const existingTemplate = {
        ...template,
        items: itemsResult.recordset
      };

      // Get AI suggestions
      const suggestions = await TemplateAIService.enhanceTemplate(
        existingTemplate,
        role || 'Employee',
        department || 'General'
      );

      res.json({
        message: 'Template enhancement suggestions generated',
        template: existingTemplate,
        suggestions,
        generated_by: 'AI'
      });
    } catch (error) {
      console.error('Error enhancing template:', error);
      res.status(500).json({
        error: 'Failed to enhance template with AI',
        details: error.message
      });
    }
  }

  /**
   * Check template compliance with AI
   */
  static async checkCompliance(req, res) {
    try {
      const { id } = req.params;

      // Get template with items
      const request = new sql.Request();
      request.input('templateId', id);

      const templateResult = await request.query(`
        SELECT * FROM ChecklistTemplates WHERE id = @templateId
      `);

      if (templateResult.recordset.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const template = templateResult.recordset[0];

      // Get items
      const itemsResult = await request.query(`
        SELECT * FROM TemplateItems 
        WHERE template_id = @templateId 
        ORDER BY sort_order
      `);

      const templateWithItems = {
        ...template,
        items: itemsResult.recordset
      };

      // Check compliance with AI
      const complianceReport = await TemplateAIService.checkCompliance(templateWithItems);

      res.json({
        message: 'Compliance check completed',
        template: templateWithItems,
        compliance: complianceReport,
        generated_by: 'AI'
      });
    } catch (error) {
      console.error('Error checking compliance:', error);
      res.status(500).json({
        error: 'Failed to check compliance with AI',
        details: error.message
      });
    }
  }

  /**
   * Get item suggestions for a template
   */
  static async suggestItems(req, res) {
    try {
      const { role, department, existing_count = 0 } = req.query;

      if (!role || !department) {
        return res.status(400).json({
          error: 'Role and department are required'
        });
      }

      const suggestions = await TemplateAIService.suggestItems(
        role,
        department,
        parseInt(existing_count)
      );

      res.json({
        message: 'Item suggestions generated',
        suggestions,
        role,
        department,
        generated_by: 'AI'
      });
    } catch (error) {
      console.error('Error suggesting items:', error);
      res.status(500).json({
        error: 'Failed to suggest items',
        details: error.message
      });
    }
  }
}

module.exports = TemplateAIController;