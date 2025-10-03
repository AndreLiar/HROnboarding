const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');

class TemplateApprovalController {
  /**
   * Submit a template for approval
   */
  static async submitForApproval(req, res) {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const userId = req.user.id;

      const request = new sql.Request();
      request.input('templateId', id);
      request.input('requesterId', userId);

      // Check if template exists and is in draft status
      const templateResult = await request.query(`
        SELECT * FROM ChecklistTemplates 
        WHERE id = @templateId AND status = 'draft'
      `);

      if (templateResult.recordset.length === 0) {
        return res.status(404).json({
          error: 'Template not found or not in draft status',
        });
      }

      const template = templateResult.recordset[0];

      // Check if user has permission to submit (owner, admin, or hr_manager)
      if (template.created_by !== userId && !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions to submit this template for approval',
        });
      }

      // Check if there's already a pending approval request
      const existingRequest = await request.query(`
        SELECT * FROM TemplateApprovalRequests 
        WHERE template_id = @templateId AND status = 'pending'
      `);

      if (existingRequest.recordset.length > 0) {
        return res.status(400).json({
          error: 'Template already has a pending approval request',
        });
      }

      // Find an approver (admin or hr_manager, but not the requester)
      const approverResult = await request.query(`
        SELECT TOP 1 id FROM Users 
        WHERE role IN ('admin', 'hr_manager') 
        AND id != @requesterId 
        AND is_active = 1
        ORDER BY 
          CASE WHEN role = 'admin' THEN 1 ELSE 2 END,
          created_at ASC
      `);

      if (approverResult.recordset.length === 0) {
        return res.status(400).json({
          error: 'No available approvers found',
        });
      }

      const approverId = approverResult.recordset[0].id;

      // Create approval request
      const approvalRequestId = uuidv4();
      await request
        .input('approvalRequestId', approvalRequestId)
        .input('approverId', approverId)
        .input('comments', comments || 'Template submitted for approval').query(`
          INSERT INTO TemplateApprovalRequests (
            id, template_id, requested_by, assigned_to, status, comments
          ) VALUES (
            @approvalRequestId, @templateId, @requesterId, @approverId, 'pending', @comments
          )
        `);

      // Update template status to pending_approval
      await request.query(`
        UPDATE ChecklistTemplates 
        SET status = 'pending_approval' 
        WHERE id = @templateId
      `);

      res.json({
        message: 'Template submitted for approval successfully',
        approvalRequestId,
        status: 'pending_approval',
      });
    } catch (error) {
      console.error('Error submitting template for approval:', error);
      res.status(500).json({
        error: 'Failed to submit template for approval',
        details: error.message,
      });
    }
  }

  /**
   * Get approval requests (for approvers)
   */
  static async getApprovalRequests(req, res) {
    try {
      const { status = 'pending', page = 1, limit = 10 } = req.query;
      const userId = req.user.id;

      const offset = (page - 1) * limit;

      const request = new sql.Request();
      request.input('userId', userId);
      request.input('status', status);
      request.input('limit', parseInt(limit));
      request.input('offset', parseInt(offset));

      // Get approval requests assigned to the user
      const query = `
        SELECT 
          tar.*,
          ct.name as template_name,
          ct.description as template_description,
          ct.category as template_category,
          ct.version as template_version,
          requester.first_name + ' ' + requester.last_name as requested_by_name,
          requester.email as requested_by_email,
          tc.display_name as category_display_name,
          tc.icon as category_icon,
          tc.color as category_color
        FROM TemplateApprovalRequests tar
        INNER JOIN ChecklistTemplates ct ON tar.template_id = ct.id
        INNER JOIN Users requester ON tar.requested_by = requester.id
        LEFT JOIN TemplateCategories tc ON ct.category = tc.name
        WHERE tar.assigned_to = @userId AND tar.status = @status
        ORDER BY tar.created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;

        SELECT COUNT(*) as total 
        FROM TemplateApprovalRequests tar
        WHERE tar.assigned_to = @userId AND tar.status = @status;
      `;

      const result = await request.query(query);
      const approvalRequests = result.recordsets[0];
      const total = result.recordsets[1][0].total;

      res.json({
        approvalRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      res.status(500).json({
        error: 'Failed to fetch approval requests',
        details: error.message,
      });
    }
  }

  /**
   * Approve a template
   */
  static async approveTemplate(req, res) {
    try {
      const { id } = req.params; // approval request ID
      const { comments } = req.body;
      const userId = req.user.id;

      const request = new sql.Request();
      request.input('approvalRequestId', id);
      request.input('approverId', userId);

      // Get approval request
      const approvalRequest = await request.query(`
        SELECT tar.*, ct.* 
        FROM TemplateApprovalRequests tar
        INNER JOIN ChecklistTemplates ct ON tar.template_id = ct.id
        WHERE tar.id = @approvalRequestId AND tar.assigned_to = @approverId AND tar.status = 'pending'
      `);

      if (approvalRequest.recordset.length === 0) {
        return res.status(404).json({
          error: 'Approval request not found or not assigned to you',
        });
      }

      const approval = approvalRequest.recordset[0];
      const templateId = approval.template_id;

      // Update approval request
      await request
        .input('templateId', templateId)
        .input('comments', comments || 'Template approved').query(`
          UPDATE TemplateApprovalRequests 
          SET 
            status = 'approved',
            comments = @comments,
            responded_at = GETUTCDATE()
          WHERE id = @approvalRequestId
        `);

      // Update template status and approval details
      await request.query(`
        UPDATE ChecklistTemplates 
        SET 
          status = 'approved',
          approved_by = @approverId,
          approved_at = GETUTCDATE()
        WHERE id = @templateId
      `);

      res.json({
        message: 'Template approved successfully',
        templateId,
        status: 'approved',
      });
    } catch (error) {
      console.error('Error approving template:', error);
      res.status(500).json({
        error: 'Failed to approve template',
        details: error.message,
      });
    }
  }

  /**
   * Reject a template
   */
  static async rejectTemplate(req, res) {
    try {
      const { id } = req.params; // approval request ID
      const { comments, changes_requested } = req.body;
      const userId = req.user.id;

      const request = new sql.Request();
      request.input('approvalRequestId', id);
      request.input('approverId', userId);

      // Get approval request
      const approvalRequest = await request.query(`
        SELECT tar.*, ct.* 
        FROM TemplateApprovalRequests tar
        INNER JOIN ChecklistTemplates ct ON tar.template_id = ct.id
        WHERE tar.id = @approvalRequestId AND tar.assigned_to = @approverId AND tar.status = 'pending'
      `);

      if (approvalRequest.recordset.length === 0) {
        return res.status(404).json({
          error: 'Approval request not found or not assigned to you',
        });
      }

      const approval = approvalRequest.recordset[0];
      const templateId = approval.template_id;

      // Update approval request
      await request
        .input('templateId', templateId)
        .input('comments', comments || 'Template rejected')
        .input('changesRequested', changes_requested || null).query(`
          UPDATE TemplateApprovalRequests 
          SET 
            status = 'rejected',
            comments = @comments,
            changes_requested = @changesRequested,
            responded_at = GETUTCDATE()
          WHERE id = @approvalRequestId
        `);

      // Update template status back to draft
      await request.query(`
        UPDATE ChecklistTemplates 
        SET status = 'draft'
        WHERE id = @templateId
      `);

      res.json({
        message: 'Template rejected successfully',
        templateId,
        status: 'draft',
        changes_requested,
      });
    } catch (error) {
      console.error('Error rejecting template:', error);
      res.status(500).json({
        error: 'Failed to reject template',
        details: error.message,
      });
    }
  }

  /**
   * Get approval request details
   */
  static async getApprovalRequestDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const request = new sql.Request();
      request.input('approvalRequestId', id);
      request.input('userId', userId);

      // Get approval request with template details
      const result = await request.query(`
        SELECT 
          tar.*,
          ct.*,
          requester.first_name + ' ' + requester.last_name as requested_by_name,
          requester.email as requested_by_email,
          approver.first_name + ' ' + approver.last_name as assigned_to_name,
          approver.email as assigned_to_email,
          tc.display_name as category_display_name,
          tc.icon as category_icon,
          tc.color as category_color
        FROM TemplateApprovalRequests tar
        INNER JOIN ChecklistTemplates ct ON tar.template_id = ct.id
        INNER JOIN Users requester ON tar.requested_by = requester.id
        INNER JOIN Users approver ON tar.assigned_to = approver.id
        LEFT JOIN TemplateCategories tc ON ct.category = tc.name
        WHERE tar.id = @approvalRequestId 
        AND (tar.requested_by = @userId OR tar.assigned_to = @userId OR @userId IN (
          SELECT id FROM Users WHERE role IN ('admin', 'hr_manager')
        ))
      `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          error: 'Approval request not found or insufficient permissions',
        });
      }

      const approvalDetails = result.recordset[0];

      // Get template items if needed
      const itemsResult = await request.input('templateId', approvalDetails.template_id).query(`
          SELECT * FROM TemplateItems 
          WHERE template_id = @templateId 
          ORDER BY sort_order ASC
        `);

      approvalDetails.template_items = itemsResult.recordset;

      res.json(approvalDetails);
    } catch (error) {
      console.error('Error fetching approval request details:', error);
      res.status(500).json({
        error: 'Failed to fetch approval request details',
        details: error.message,
      });
    }
  }

  /**
   * Get approval history for a template
   */
  static async getTemplateApprovalHistory(req, res) {
    try {
      const { templateId } = req.params;

      const request = new sql.Request();
      request.input('templateId', templateId);

      const result = await request.query(`
        SELECT 
          tar.*,
          requester.first_name + ' ' + requester.last_name as requested_by_name,
          approver.first_name + ' ' + approver.last_name as assigned_to_name
        FROM TemplateApprovalRequests tar
        INNER JOIN Users requester ON tar.requested_by = requester.id
        INNER JOIN Users approver ON tar.assigned_to = approver.id
        WHERE tar.template_id = @templateId
        ORDER BY tar.created_at DESC
      `);

      res.json(result.recordset);
    } catch (error) {
      console.error('Error fetching template approval history:', error);
      res.status(500).json({
        error: 'Failed to fetch template approval history',
        details: error.message,
      });
    }
  }
}

module.exports = TemplateApprovalController;
