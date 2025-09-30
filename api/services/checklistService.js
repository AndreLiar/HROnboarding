const openai = require('../config/openai');
const { SYSTEM_PROMPT } = require('../utils/prompts');
const { getFallbackChecklist } = require('../utils/fallback');

class ChecklistService {
  static async generateChecklist(role, department) {
    let checklist;

    if (openai) {
      try {
        const userPrompt = `Rôle: ${role}, Département: ${department}`;
        const completion = await openai.chat.completions.create({
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
