const adaptateurHorlogeParDefaut = require('./adaptateurHorloge');

const nouvelAdaptateur = (
  donnees = {},
  adaptateurHorloge = adaptateurHorlogeParDefaut
) => {
  donnees.utilisateurs ||= [];
  donnees.homologations ||= [];
  donnees.services ||= [];
  donnees.autorisations ||= [];
  donnees.parcoursUtilisateurs ||= [];

  const metsAJourEnregistrement = (
    fonctionRecherche,
    id,
    donneesAMettreAJour
  ) =>
    fonctionRecherche(id)
      .then((e) => Object.assign(e, donneesAMettreAJour))
      .then(() => {});

  const supprimeEnregistrement = (nomTable, id) => {
    donnees[nomTable] = donnees[nomTable].filter((e) => e.id !== id);
    return Promise.resolve();
  };

  const ajouteHomologation = (id, donneesHomologation) => {
    donnees.homologations.push({ id, ...donneesHomologation });
    return Promise.resolve();
  };

  const ajouteService = (id, donneesService) => {
    donnees.services.push({ id, ...donneesService });
    return Promise.resolve();
  };

  const ajouteUtilisateur = (id, donneesUtilisateur) => {
    donnees.utilisateurs.push(
      Object.assign(donneesUtilisateur, {
        id,
        dateCreation: adaptateurHorloge.maintenant(),
      })
    );
    return Promise.resolve();
  };

  const autorisations = (idUtilisateur) => {
    const seulementUnUtilisateur = typeof idUtilisateur !== 'undefined';

    const filtre = seulementUnUtilisateur
      ? (a) => a.idUtilisateur === idUtilisateur
      : (a) => a.type === 'createur';

    return Promise.resolve(donnees.autorisations.filter(filtre));
  };

  const intervenantsHomologation = (idHomologation) =>
    donnees.autorisations
      .filter((a) => a.idHomologation === idHomologation)
      .reduce(
        (acc, a) => {
          acc[`${a.type}s`].push(
            donnees.utilisateurs.find((u) => u.id === a.idUtilisateur)
          );
          return acc;
        },
        { createurs: [], contributeurs: [] }
      );

  const homologation = (id) => {
    const homologationTrouvee = donnees.homologations.find((h) => h.id === id);
    if (homologationTrouvee) {
      const intervenants = intervenantsHomologation(id);
      [homologationTrouvee.createur] = intervenants.createurs;
      homologationTrouvee.contributeurs = intervenants.contributeurs;
    }
    return Promise.resolve(homologationTrouvee);
  };

  const service = (id) => {
    const serviceTrouve = donnees.services.find((s) => s.id === id);
    if (serviceTrouve) {
      const intervenants = intervenantsHomologation(id);
      [serviceTrouve.createur] = intervenants.createurs;
      serviceTrouve.contributeurs = intervenants.contributeurs;
    }
    return Promise.resolve(serviceTrouve);
  };

  const homologations = (idUtilisateur) =>
    autorisations(idUtilisateur).then((as) =>
      Promise.all(as.map(({ idHomologation }) => homologation(idHomologation)))
    );

  const homologationAvecNomService = (
    idUtilisateur,
    nomService,
    idHomologationMiseAJour
  ) =>
    homologations(idUtilisateur).then((hs) =>
      hs.find(
        (h) =>
          h.id !== idHomologationMiseAJour &&
          h.descriptionService?.nomService === nomService
      )
    );

  const metsAJourHomologation = (...params) =>
    metsAJourEnregistrement(homologation, ...params);

  const metsAJourService = (...params) =>
    metsAJourEnregistrement(service, ...params);

  const sauvegardeHomologation = (id, donneesHomologation) => {
    const dejaConnue =
      donnees.homologations.find((h) => h.id === id) !== undefined;
    return dejaConnue
      ? metsAJourHomologation(id, donneesHomologation)
      : ajouteHomologation(id, donneesHomologation);
  };

  const sauvegardeService = (id, donneesService) => {
    const dejaConnu = donnees.services.find((s) => s.id === id) !== undefined;
    return dejaConnu
      ? metsAJourService(id, donneesService)
      : ajouteService(id, donneesService);
  };

  const supprimeHomologation = (...params) =>
    supprimeEnregistrement('homologations', ...params);

  const supprimeHomologations = () => {
    donnees.homologations = [];
    return Promise.resolve();
  };

  const supprimeService = (...params) =>
    supprimeEnregistrement('services', ...params);

  const supprimeUtilisateur = (...params) =>
    supprimeEnregistrement('utilisateurs', ...params);

  const supprimeUtilisateurs = () => {
    donnees.utilisateurs = [];
    return Promise.resolve();
  };

  const utilisateur = (id) =>
    Promise.resolve(donnees.utilisateurs.find((u) => u.id === id));

  const metsAJourUtilisateur = (...params) =>
    metsAJourEnregistrement(utilisateur, ...params);

  const utilisateurAvecEmail = (email) =>
    Promise.resolve(donnees.utilisateurs.find((u) => u.email === email));

  const utilisateurAvecIdReset = (idReset) =>
    Promise.resolve(
      donnees.utilisateurs.find((u) => u.idResetMotDePasse === idReset)
    );

  const tousUtilisateurs = () => Promise.resolve(donnees.utilisateurs);

  const autorisation = (id) =>
    Promise.resolve(donnees.autorisations.find((a) => a.id === id));

  const idsHomologationsCreeesParUtilisateur = (
    idUtilisateur,
    idsHomologationsAExclure = []
  ) =>
    Promise.resolve(
      donnees.autorisations
        .filter(
          (as) =>
            as.idUtilisateur === idUtilisateur &&
            as.type === 'createur' &&
            !idsHomologationsAExclure.includes(as.idHomologation)
        )
        .map((a) => a.idHomologation)
    );

  const autorisationPour = (idUtilisateur, idHomologation) =>
    Promise.resolve(
      donnees.autorisations.find(
        (a) =>
          a.idUtilisateur === idUtilisateur &&
          a.idHomologation === idHomologation
      )
    );

  const ajouteAutorisation = (id, donneesAutorisation) => {
    donnees.autorisations.push(Object.assign(donneesAutorisation, { id }));
    return Promise.resolve();
  };

  const nbAutorisationsCreateur = (idUtilisateur) =>
    Promise.resolve(
      donnees.autorisations.filter(
        (a) => a.idUtilisateur === idUtilisateur && a.type === 'createur'
      ).length
    );

  const supprimeAutorisation = (idUtilisateur, idHomologation) => {
    donnees.autorisations = donnees.autorisations.filter(
      (a) =>
        a.idUtilisateur !== idUtilisateur && a.idHomologation !== idHomologation
    );
    return Promise.resolve();
  };

  const supprimeAutorisations = () =>
    Promise.resolve((donnees.autorisations = []));

  const supprimeAutorisationsContribution = (idUtilisateur) => {
    donnees.autorisations = donnees.autorisations.filter(
      (a) => a.idUtilisateur !== idUtilisateur || a.type !== 'contributeur'
    );
    return Promise.resolve();
  };

  const supprimeAutorisationsHomologation = (idHomologation) => {
    donnees.autorisations = donnees.autorisations.filter(
      (a) => a.idHomologation !== idHomologation
    );
    return Promise.resolve();
  };

  const transfereAutorisations = (idUtilisateurSource, idUtilisateurCible) => {
    const autorisationContributionExistante = (idUtilisateur, idHomologation) =>
      !!donnees.autorisations.find(
        (a) =>
          a.idUtilisateur === idUtilisateur &&
          a.idHomologation === idHomologation &&
          a.type === 'contributeur'
      );

    const supprimeAutorisationsContributionDejaPresentes = () => {
      donnees.autorisations = donnees.autorisations.filter(
        (a) =>
          a.idUtilisateur !== idUtilisateurSource ||
          a.type !== 'contributeur' ||
          !autorisationContributionExistante(
            idUtilisateurCible,
            a.idHomologation
          )
      );

      return Promise.resolve();
    };

    const operationTransfert = () =>
      autorisations(idUtilisateurSource)
        .then((as) =>
          as.map((a) => Promise.resolve((a.idUtilisateur = idUtilisateurCible)))
        )
        .then((transferts) => Promise.all(transferts));

    const supprimeDoublonsCreationContribution = (idUtilisateur) => {
      const idsHomologationsCreees = donnees.autorisations
        .filter(
          (a) => a.idUtilisateur === idUtilisateur && a.type === 'createur'
        )
        .map((a) => a.idHomologation);

      donnees.autorisations = donnees.autorisations.filter(
        (a) =>
          a.idUtilisateur !== idUtilisateur ||
          a.type !== 'contributeur' ||
          !idsHomologationsCreees.includes(a.idHomologation)
      );

      return Promise.resolve();
    };

    return supprimeAutorisationsContributionDejaPresentes(
      idUtilisateurSource,
      idUtilisateurCible
    )
      .then(operationTransfert)
      .then(() => supprimeDoublonsCreationContribution(idUtilisateurCible));
  };

  const lisParcoursUtilisateur = async (id) =>
    donnees.parcoursUtilisateurs.find((p) => p.id === id);

  const sauvegardeParcoursUtilisateur = async (
    id,
    donneesParcoursUtilisateur
  ) => {
    const dejaConnu = donnees.parcoursUtilisateurs.find((p) => p.id === id);

    if (!dejaConnu)
      donnees.parcoursUtilisateurs.push({ id, ...donneesParcoursUtilisateur });
    else dejaConnu.donnees = donneesParcoursUtilisateur;
  };

  return {
    ajouteAutorisation,
    ajouteUtilisateur,
    autorisation,
    autorisationPour,
    autorisations,
    homologation,
    homologationAvecNomService,
    homologations,
    idsHomologationsCreeesParUtilisateur,
    lisParcoursUtilisateur,
    metsAJourUtilisateur,
    nbAutorisationsCreateur,
    sauvegardeParcoursUtilisateur,
    sauvegardeHomologation,
    sauvegardeService,
    service,
    supprimeAutorisation,
    supprimeAutorisations,
    supprimeAutorisationsContribution,
    supprimeAutorisationsHomologation,
    supprimeHomologation,
    supprimeHomologations,
    supprimeService,
    supprimeUtilisateur,
    supprimeUtilisateurs,
    transfereAutorisations,
    tousUtilisateurs,
    utilisateur,
    utilisateurAvecEmail,
    utilisateurAvecIdReset,
  };
};

module.exports = { nouvelAdaptateur };
