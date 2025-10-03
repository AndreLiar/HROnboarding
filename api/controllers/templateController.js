const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');

class TemplateController {
  /**
   * Get all templates with filtering and pagination
   */
  static async getAllTemplates(req, res) {
    try {
      const {
        category,
        status = 'approved',
        search,
        page = 1,
        limit = 10,
        sortBy = 'updated_at',
        sortOrder = 'DESC',
      } = req.query;

      const offset = (page - 1) * limit;

      let whereClause = 'WHERE ct.status = @status';
      const request = new sql.Request();
      request.input('status', status);
      request.input('limit', parseInt(limit));
      request.input('offset', parseInt(offset));

      if (category) {
        whereClause += ' AND ct.category = @category';
        request.input('category', category);
      }

      if (search) {
        whereClause +=
          ' AND (ct.name LIKE @search OR ct.description LIKE @search OR ct.tags LIKE @search)';
        request.input('search', `%${search}%`);
      }

      const query = `
        SELECT 
          ct.*,
          u.first_name + ' ' + u.last_name as created_by_name,
          a.first_name + ' ' + a.last_name as approved_by_name,
          tc.display_name as category_display_name,
          tc.icon as category_icon,
          tc.color as category_color,
          (SELECT COUNT(*) FROM TemplateItems WHERE template_id = ct.id) as item_count
        FROM ChecklistTemplates ct
        LEFT JOIN Users u ON ct.created_by = u.id
        LEFT JOIN Users a ON ct.approved_by = a.id
        LEFT JOIN TemplateCategories tc ON ct.category = tc.name
        ${whereClause}
        ORDER BY ct.${sortBy} ${sortOrder}
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;

        SELECT COUNT(*) as total 
        FROM ChecklistTemplates ct 
        ${whereClause};
      `;

      const result = await request.query(query);
      const templates = result.recordsets[0];
      const total = result.recordsets[1][0].total;

      res.json({
        templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        error: 'Failed to fetch templates',
        details: error.message,
      });
    }
  }

  /**
   * Get a specific template by ID with items
   */
  static async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const { includeItems = true } = req.query;

      const request = new sql.Request();
      request.input('templateId', id);

      // Get template details
      const templateQuery = `
        SELECT 
          ct.*,
          u.first_name + ' ' + u.last_name as created_by_name,
          a.first_name + ' ' + a.last_name as approved_by_name,
          tc.display_name as category_display_name,
          tc.icon as category_icon,
          tc.color as category_color
        FROM ChecklistTemplates ct
        LEFT JOIN Users u ON ct.created_by = u.id
        LEFT JOIN Users a ON ct.approved_by = a.id
        LEFT JOIN TemplateCategories tc ON ct.category = tc.name
        WHERE ct.id = @templateId
      `;

      const templateResult = await request.query(templateQuery);

      if (templateResult.recordset.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const template = templateResult.recordset[0];

      // Get template items if requested
      if (includeItems === 'true' || includeItems === true) {
        const itemsQuery = `
          SELECT * FROM TemplateItems 
          WHERE template_id = @templateId 
          ORDER BY sort_order ASC
        `;

        const itemsResult = await request.query(itemsQuery);
        template.items = itemsResult.recordset;
      }

      res.json(template);
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        error: 'Failed to fetch template',
        details: error.message,
      });
    }
  }

  /**
   * Create a new template
   */
  static async createTemplate(req, res) {
    try {
      const {
        name,
        description,
        category,
        template_data,
        tags,
        estimated_duration_minutes,
        target_roles,
        target_departments,
        compliance_frameworks,
        items = [],
      } = req.body;

      const userId = req.user.id;
      const templateId = uuidv4();

      const request = new sql.Request();

      // Create template
      await request
        .input('id', templateId)
        .input('name', name)
        .input('description', description || null)
        .input('category', category)
        .input('template_data', template_data || '{}')
        .input('tags', tags || null)
        .input('estimated_duration_minutes', estimated_duration_minutes || null)
        .input('target_roles', target_roles || null)
        .input('target_departments', target_departments || null)
        .input('compliance_frameworks', compliance_frameworks || null)
        .input('created_by', userId).query(`
          INSERT INTO ChecklistTemplates (
            id, name, description, category, template_data, tags,
            estimated_duration_minutes, target_roles, target_departments,
            compliance_frameworks, created_by, status
          ) VALUES (
            @id, @name, @description, @category, @template_data, @tags,
            @estimated_duration_minutes, @target_roles, @target_departments,
            @compliance_frameworks, @created_by, 'draft'
          )
        `);

      // Create template items if provided
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await request
            .input(`item_id_${i}`, uuidv4())
            .input(`item_template_id_${i}`, templateId)
            .input(`item_title_${i}`, item.title)
            .input(`item_description_${i}`, item.description || null)
            .input(`item_category_${i}`, item.category || null)
            .input(`item_is_required_${i}`, item.is_required !== false)
            .input(`item_estimated_duration_${i}`, item.estimated_duration_minutes || 30)
            .input(`item_sort_order_${i}`, item.sort_order || i + 1)
            .input(`item_dependencies_${i}`, item.dependencies || null)
            .input(`item_assignee_role_${i}`, item.assignee_role || 'employee')
            .input(`item_due_days_${i}`, item.due_days_from_start || 1)
            .input(`item_instructions_${i}`, item.instructions || null)
            .input(`item_success_criteria_${i}`, item.success_criteria || null)
            .input(`item_attachments_required_${i}`, item.attachments_required || false)
            .input(`item_approval_required_${i}`, item.approval_required || false).query(`
              INSERT INTO TemplateItems (
                id, template_id, title, description, category, is_required,
                estimated_duration_minutes, sort_order, dependencies, assignee_role,
                due_days_from_start, instructions, success_criteria,
                attachments_required, approval_required
              ) VALUES (
                @item_id_${i}, @item_template_id_${i}, @item_title_${i}, @item_description_${i},
                @item_category_${i}, @item_is_required_${i}, @item_estimated_duration_${i},
                @item_sort_order_${i}, @item_dependencies_${i}, @item_assignee_role_${i},
                @item_due_days_${i}, @item_instructions_${i}, @item_success_criteria_${i},
                @item_attachments_required_${i}, @item_approval_required_${i}
              )
            `);
        }
      }

      res.status(201).json({
        message: 'Template created successfully',
        templateId,
        status: 'draft',
      });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        error: 'Failed to create template',
        details: error.message,
      });
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        template_data,
        tags,
        estimated_duration_minutes,
        target_roles,
        target_departments,
        compliance_frameworks,
      } = req.body;

      const userId = req.user.id;

      const request = new sql.Request();

      // Check if template exists and user has permission
      const existingTemplate = await request
        .input('templateId', id)
        .query('SELECT * FROM ChecklistTemplates WHERE id = @templateId');

      if (existingTemplate.recordset.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const template = existingTemplate.recordset[0];

      // Check permissions (owner, admin, or hr_manager)
      if (template.created_by !== userId && !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions to update this template' });
      }

      // Create version history entry before updating
      await request
        .input('historyId', uuidv4())
        .input('versionNumber', template.version)
        .input('templateData', template.template_data)
        .input('templateName', template.name)
        .input('templateDescription', template.description)
        .input('changedBy', userId).query(`
          INSERT INTO TemplateVersionHistory (
            id, template_id, version_number, name, description, 
            template_data, created_by
          ) VALUES (
            @historyId, @templateId, @versionNumber, @templateName,
            @templateDescription, @templateData, @changedBy
          )
        `);

      // Update template
      await request
        .input('newName', name || template.name)
        .input('newDescription', description !== undefined ? description : template.description)
        .input('newCategory', category || template.category)
        .input('newTemplateData', template_data || template.template_data)
        .input('newTags', tags !== undefined ? tags : template.tags)
        .input(
          'newEstimatedDuration',
          estimated_duration_minutes !== undefined
            ? estimated_duration_minutes
            : template.estimated_duration_minutes
        )
        .input('newTargetRoles', target_roles !== undefined ? target_roles : template.target_roles)
        .input(
          'newTargetDepartments',
          target_departments !== undefined ? target_departments : template.target_departments
        )
        .input(
          'newComplianceFrameworks',
          compliance_frameworks !== undefined
            ? compliance_frameworks
            : template.compliance_frameworks
        )
        .input('newVersion', template.version + 1).query(`
          UPDATE ChecklistTemplates SET
            name = @newName,
            description = @newDescription,
            category = @newCategory,
            template_data = @newTemplateData,
            tags = @newTags,
            estimated_duration_minutes = @newEstimatedDuration,
            target_roles = @newTargetRoles,
            target_departments = @newTargetDepartments,
            compliance_frameworks = @newComplianceFrameworks,
            version = @newVersion,
            status = 'draft'
          WHERE id = @templateId
        `);

      res.json({
        message: 'Template updated successfully',
        version: template.version + 1,
        status: 'draft',
      });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({
        error: 'Failed to update template',
        details: error.message,
      });
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const request = new sql.Request();
      request.input('templateId', id);

      // Check if template exists and user has permission
      const existingTemplate = await request.query(
        'SELECT * FROM ChecklistTemplates WHERE id = @templateId'
      );

      if (existingTemplate.recordset.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const template = existingTemplate.recordset[0];

      // Check permissions (owner, admin, or hr_manager)
      if (template.created_by !== userId && !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions to delete this template' });
      }

      // Check if template is being used
      const usageCheck = await request.query(
        'SELECT COUNT(*) as count FROM TemplateUsage WHERE template_id = @templateId'
      );

      if (usageCheck.recordset[0].count > 0) {
        return res.status(400).json({
          error: 'Cannot delete template that has been used. Consider archiving instead.',
        });
      }

      // Delete template (cascade will handle items and history)
      await request.query('DELETE FROM ChecklistTemplates WHERE id = @templateId');

      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        error: 'Failed to delete template',
        details: error.message,
      });
    }
  }

  /**
   * Get all template categories
   */
  static async getCategories(req, res) {
    try {
      const request = new sql.Request();
      const result = await request.query(`
        SELECT 
          tc.id,
          tc.name,
          tc.display_name,
          tc.icon,
          tc.color,
          tc.sort_order,
          tc.is_active,
          tc.created_by,
          tc.created_at,
          COUNT(ct.id) as template_count
        FROM TemplateCategories tc
        LEFT JOIN ChecklistTemplates ct ON tc.name = ct.category AND ct.status = 'approved'
        WHERE tc.is_active = 1
        GROUP BY tc.id, tc.name, tc.display_name, tc.icon, 
                 tc.color, tc.sort_order, tc.is_active, tc.created_by, tc.created_at
        ORDER BY tc.sort_order ASC
      `);

      res.json(result.recordset);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        error: 'Failed to fetch categories',
        details: error.message,
      });
    }
  }

  /**
   * Clone/duplicate a template
   */
  static async cloneTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user.id;

      const request = new sql.Request();
      request.input('sourceTemplateId', id);

      // Get source template
      const sourceTemplate = await request.query(`
        SELECT * FROM ChecklistTemplates WHERE id = @sourceTemplateId
      `);

      if (sourceTemplate.recordset.length === 0) {
        return res.status(404).json({ error: 'Source template not found' });
      }

      const template = sourceTemplate.recordset[0];
      const newTemplateId = uuidv4();

      // Create cloned template
      await request
        .input('newTemplateId', newTemplateId)
        .input('newName', name || `${template.name} (Copy)`)
        .input('createdBy', userId).query(`
          INSERT INTO ChecklistTemplates (
            id, name, description, category, template_data, tags,
            estimated_duration_minutes, target_roles, target_departments,
            compliance_frameworks, created_by, status, version
          ) 
          SELECT 
            @newTemplateId, @newName, description, category, template_data, tags,
            estimated_duration_minutes, target_roles, target_departments,
            compliance_frameworks, @createdBy, 'draft', 1
          FROM ChecklistTemplates 
          WHERE id = @sourceTemplateId
        `);

      // Clone template items
      await request.query(`
        INSERT INTO TemplateItems (
          id, template_id, title, description, category, is_required,
          estimated_duration_minutes, sort_order, dependencies, assignee_role,
          due_days_from_start, instructions, success_criteria,
          attachments_required, approval_required
        )
        SELECT 
          NEWID(), @newTemplateId, title, description, category, is_required,
          estimated_duration_minutes, sort_order, dependencies, assignee_role,
          due_days_from_start, instructions, success_criteria,
          attachments_required, approval_required
        FROM TemplateItems 
        WHERE template_id = @sourceTemplateId
      `);

      res.status(201).json({
        message: 'Template cloned successfully',
        templateId: newTemplateId,
        name: name || `${template.name} (Copy)`,
      });
    } catch (error) {
      console.error('Error cloning template:', error);
      res.status(500).json({
        error: 'Failed to clone template',
        details: error.message,
      });
    }
  }
}

module.exports = TemplateController;
