class EchecAutorisation extends Error {}
class EchecEnvoiMessage extends Error {}
class ErreurModele extends Error {}
class ErreurAutorisationExisteDeja extends ErreurModele {}
class ErreurAutorisationInexistante extends ErreurModele {}
class ErreurAvisInvalide extends ErreurModele {}
class ErreurCategorieInconnue extends ErreurModele {}
class ErreurDateHomologationInvalide extends ErreurModele {}
class ErreurDateRenouvellementInvalide extends ErreurModele {}
class ErreurDepartementInconnu extends ErreurModele {}
class ErreurDonneesObligatoiresManquantes extends ErreurModele {}
class ErreurDonneesReferentielIncorrectes extends Error {}
class ErreurDonneesStatistiques extends ErreurModele {}
class ErreurDossierDejaFinalise extends ErreurModele {}
class ErreurDossierEtapeInconnue extends ErreurModele {
  constructor(etapeInconnue) {
    super(`L'étape ${etapeInconnue} n'est pas une propriété du dossier.`);
    this.etapeInconnue = etapeInconnue;
  }
}
class ErreurDossierNonFinalisable extends ErreurModele {
  constructor(message, etapesIncompletes) {
    super(message);
    this.etapesIncompletes = etapesIncompletes;
  }
}
class ErreurDossierNonFinalise extends ErreurModele {}
class ErreurDossiersInvalides extends ErreurModele {}
class ErreurDureeValiditeInvalide extends ErreurModele {}
class ErreurEmailManquant extends ErreurModele {}
class ErreurHomologationInexistante extends ErreurModele {}
class ErreurIdentifiantActionSaisieInvalide extends ErreurModele {}
class ErreurIdentifiantActionSaisieManquant extends ErreurModele {}
class ErreurLocalisationDonneesInvalide extends ErreurModele {}
class ErreurMesureInconnue extends ErreurModele {}
class ErreurNiveauGraviteInconnu extends ErreurModele {}
class ErreurNomServiceDejaExistant extends ErreurModele {}
class ErreurProprieteManquante extends ErreurModele {}
class ErreurRisqueInconnu extends ErreurModele {}
class ErreurStatutDeploiementInvalide extends ErreurModele {}
class ErreurStatutMesureInvalide extends ErreurModele {}
class ErreurSuppressionImpossible extends Error {}
class ErreurTentativeSuppressionCreateur extends ErreurModele {}
class ErreurTranfertVersUtilisateurSource extends Error {}
class ErreurUtilisateurInexistant extends ErreurModele {}
class ErreurTypeInconnu extends ErreurModele {}

class ErreurUtilisateurExistant extends ErreurModele {
  constructor(message, idUtilisateur) {
    super(message);
    this.idUtilisateur = idUtilisateur;
  }
}

module.exports = {
  EchecAutorisation,
  EchecEnvoiMessage,
  ErreurAutorisationExisteDeja,
  ErreurAutorisationInexistante,
  ErreurAvisInvalide,
  ErreurCategorieInconnue,
  ErreurDateHomologationInvalide,
  ErreurDateRenouvellementInvalide,
  ErreurDepartementInconnu,
  ErreurDonneesObligatoiresManquantes,
  ErreurDonneesReferentielIncorrectes,
  ErreurDonneesStatistiques,
  ErreurDossierDejaFinalise,
  ErreurDossierEtapeInconnue,
  ErreurDossierNonFinalisable,
  ErreurDossierNonFinalise,
  ErreurDossiersInvalides,
  ErreurDureeValiditeInvalide,
  ErreurEmailManquant,
  ErreurHomologationInexistante,
  ErreurIdentifiantActionSaisieInvalide,
  ErreurIdentifiantActionSaisieManquant,
  ErreurLocalisationDonneesInvalide,
  ErreurMesureInconnue,
  ErreurModele,
  ErreurNiveauGraviteInconnu,
  ErreurNomServiceDejaExistant,
  ErreurProprieteManquante,
  ErreurRisqueInconnu,
  ErreurStatutDeploiementInvalide,
  ErreurStatutMesureInvalide,
  ErreurSuppressionImpossible,
  ErreurTentativeSuppressionCreateur,
  ErreurTranfertVersUtilisateurSource,
  ErreurTypeInconnu,
  ErreurUtilisateurExistant,
  ErreurUtilisateurInexistant,
};
