const openai = require('../config/openai');
const { SYSTEM_PROMPT } = require('../utils/prompts');
const { getFallbackChecklist } = require('../utils/fallback');

class ChecklistService {
  // Allow injection of OpenAI client for testing
  static openaiClient = openai;

  static async generateChecklist(role, department) {
    let checklist;

    if (this.openaiClient) {
      try {
        const userPrompt = `Rôle: ${role}, Département: ${department}`;
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const checklistText = completion.choices[0].message.content.trim();
        checklist = JSON.parse(checklistText);
      } catch (aiError) {
        console.warn('OpenAI API error, using fallback:', aiError.message);
        // In test mode, throw the error instead of using fallback
        if (process.env.NODE_ENV === 'test') {
          throw aiError;
        }
        checklist = null;
      }
    }

    // Fallback checklist if OpenAI is not available or failed
    if (!checklist) {
      checklist = getFallbackChecklist(role, department);
    }

    return {
      checklist,
      role,
      department,
    };
  }
}

module.exports = ChecklistService;
