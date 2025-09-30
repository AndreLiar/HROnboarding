// Fallback checklist when OpenAI is not available
const getFallbackChecklist = (role, department) => {
  return [
    { étape: "Compléter la Déclaration Préalable à l'Embauche (DPAE)" },
    { étape: 'Créer un compte utilisateur et configurer les accès' },
    { étape: 'Planifier la visite médicale obligatoire' },
    { étape: 'Présentation des procédures RGPD et sécurité' },
    { étape: "Réunion d'accueil avec l'équipe" },
    { étape: `Formation spécifique au rôle: ${role}` },
    { étape: `Intégration équipe ${department}` },
  ];
};

module.exports = {
  getFallbackChecklist,
};
