const expect = require('expect.js');

const uneDescriptionValide = require('../constructeurs/constructeurDescriptionService');
const { unDossier } = require('../constructeurs/constructeurDossier');

const Referentiel = require('../../src/referentiel');
const InformationsHomologation = require('../../src/modeles/informationsHomologation');
const Homologation = require('../../src/modeles/homologation');
const MesureGenerale = require('../../src/modeles/mesureGenerale');
const Utilisateur = require('../../src/modeles/utilisateur');
const VueAnnexePDFDescription = require('../../src/modeles/objetsVues/vueAnnexePDFDescription');
const VueAnnexePDFMesures = require('../../src/modeles/objetsVues/vueAnnexePDFMesures');
const VueAnnexePDFRisques = require('../../src/modeles/objetsVues/vueAnnexePDFRisques');

describe('Une homologation', () => {
  it('connaît le nom du service', () => {
    const homologation = new Homologation({
      id: '123',
      idUtilisateur: '456',
      descriptionService: { nomService: 'Super Service' },
    });

    expect(homologation.nomService()).to.equal('Super Service');
  });

  it('connaît ses contributrices et contributeurs', () => {
    const homologation = new Homologation({
      id: '123',
      contributeurs: [
        {
          id: '456',
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
        },
      ],
    });

    const { contributeurs } = homologation;
    expect(contributeurs.length).to.equal(1);

    const contributeur = contributeurs[0];
    expect(contributeur).to.be.an(Utilisateur);
    expect(contributeur.id).to.equal('456');
  });

  it('connaît son créateur', () => {
    const homologation = new Homologation({
      id: '123',
      createur: {
        id: '456',
        prenom: 'Jean',
        nom: 'Dupont',
        email: 'jean.dupont@mail.fr',
      },
    });

    const { createur } = homologation;
    expect(createur).to.be.an(Utilisateur);
    expect(createur.id).to.equal('456');
  });

  it('sait se convertir en JSON', () => {
    const homologation = new Homologation({
      id: '123',
      createur: {
        id: '456',
        prenom: 'Bruno',
        nom: 'Dumans',
        email: 'bruno.dumans@mail.fr',
      },
      descriptionService: { nomService: 'Super Service' },
      contributeurs: [
        {
          id: '999',
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
        },
      ],
    });

    expect(homologation.toJSON()).to.eql({
      id: '123',
      nomService: 'Super Service',
      createur: {
        id: '456',
        cguAcceptees: false,
        prenomNom: 'Bruno Dumans',
        telephone: '',
        initiales: 'BD',
        poste: '',
        posteDetaille: '',
        rssi: false,
        delegueProtectionDonnees: false,
        nomEntitePublique: '',
        departementEntitePublique: '',
        profilEstComplet: true,
        infolettreAcceptee: false,
      },
      contributeurs: [
        {
          id: '999',
          cguAcceptees: false,
          prenomNom: 'Jean Dupont',
          telephone: '',
          initiales: 'JD',
          poste: '',
          posteDetaille: '',
          rssi: false,
          delegueProtectionDonnees: false,
          nomEntitePublique: '',
          departementEntitePublique: '',
          profilEstComplet: true,
          infolettreAcceptee: false,
        },
      ],
    });
  });

  it('sait décrire le type service', () => {
    const referentiel = Referentiel.creeReferentiel({
      typesService: {
        unType: { description: 'Un type' },
        unAutre: { description: 'Un autre' },
      },
    });
    const homologation = new Homologation(
      {
        id: '123',
        idUtilisateur: '456',
        descriptionService: {
          nomService: 'nom',
          typeService: ['unType', 'unAutre'],
        },
      },
      referentiel
    );

    expect(homologation.descriptionTypeService()).to.equal('Un type, Un autre');
  });

  it("se comporte correctement si le type service n'est pas présente", () => {
    const homologation = new Homologation({ id: '123' });
    expect(homologation.descriptionTypeService()).to.equal(
      'Type de service non renseignée'
    );
  });

  it('connaît les rôles et responsabilités de ses acteurs et parties prenantes', () => {
    const homologation = new Homologation({
      id: '123',
      rolesResponsabilites: {
        autoriteHomologation: 'Jean Dupont',
        fonctionAutoriteHomologation: 'Maire',
        delegueProtectionDonnees: 'Rémi Fassol',
        piloteProjet: 'Sylvie Martin',
        expertCybersecurite: 'Anna Dubreuil',
        partiesPrenantes: [
          { type: 'Hebergement', nom: 'Hébergeur' },
          { type: 'DeveloppementFourniture', nom: 'Une structure' },
        ],
      },
    });

    expect(homologation.autoriteHomologation()).to.equal('Jean Dupont');
    expect(homologation.fonctionAutoriteHomologation()).to.equal('Maire');
    expect(homologation.delegueProtectionDonnees()).to.equal('Rémi Fassol');
    expect(homologation.piloteProjet()).to.equal('Sylvie Martin');
    expect(homologation.expertCybersecurite()).to.equal('Anna Dubreuil');
    expect(homologation.hebergeur()).to.equal('Hébergeur');
    expect(homologation.structureDeveloppement()).to.equal('Une structure');
  });

  it('connaît ses dossiers', () => {
    const referentiel = Referentiel.creeReferentiel({
      echeancesRenouvellement: { unAn: {} },
    });
    const homologation = new Homologation(
      { id: '123', dossiers: [{ id: '999' }] },
      referentiel
    );

    expect(homologation.nombreDossiers()).to.equal(1);
  });

  it('connaît le dossier courant', () => {
    const referentiel = Referentiel.creeReferentiel({
      echeancesRenouvellement: { unAn: {} },
    });
    const homologation = new Homologation(
      {
        id: '123',
        dossiers: [
          {
            id: '777',
            dateHomologation: '2022-12-01',
            dureeValidite: 'unAn',
            finalise: true,
          },
          { id: '999' },
        ],
      },
      referentiel
    );

    expect(homologation.dossierCourant().id).to.equal('999');
  });

  describe('sur demande des documents PDF disponibles', () => {
    const referentiel = Referentiel.creeReferentiel({
      etapesParcoursHomologation: [
        { id: 'autorite', numero: 1 },
        { id: 'avis', numero: 2 },
      ],
      etapeNecessairePourDossierDecision: 'avis',
    });

    it("inclut tous les documents lorsqu'elle a un dossier d'homologation courant à une étape suffisante", () => {
      const homologationAvecDossier = new Homologation(
        {
          id: '123',
          dossiers: [
            unDossier(referentiel).avecAutorite('Jean Dujardin', 'RSSI')
              .donnees,
          ],
        },
        referentiel
      );

      expect(homologationAvecDossier.documentsPdfDisponibles()).to.eql([
        'annexes',
        'syntheseSecurite',
        'dossierDecision',
      ]);
    });

    it("exclut le dossier de décision en cas d'absence de dossier d'homologation courant", () => {
      const homologationSansDossier = new Homologation(
        { id: '123', dossiers: [] },
        referentiel
      );

      expect(homologationSansDossier.documentsPdfDisponibles()).to.eql([
        'annexes',
        'syntheseSecurite',
      ]);
    });

    it("exclut le dossier de décision si l'étape courante du dossier d'homologation n'est pas suffisante", () => {
      const homologationSansDossier = new Homologation(
        { id: '123', dossiers: [unDossier(referentiel).donnees] },
        referentiel
      );

      expect(homologationSansDossier.documentsPdfDisponibles()).to.eql([
        'annexes',
        'syntheseSecurite',
      ]);
    });
  });

  it('connaît ses risques spécifiques', () => {
    const homologation = new Homologation({
      id: '123',
      risquesSpecifiques: [{ description: 'Un risque' }],
    });

    expect(homologation.risquesSpecifiques().nombre()).to.equal(1);
  });

  it('se construit en renseignant le caractère indispensable des mesures générales grâce aux mesures personnalisées', () => {
    const moteur = { mesures: () => ({ m1: { indispensable: true } }) };
    const referentiel = Referentiel.creeReferentiel({ mesures: { m1: {} } });

    const homologation = new Homologation(
      {
        id: '123',
        mesuresGenerales: [{ id: 'm1' }],
      },
      referentiel,
      moteur
    );

    expect(
      homologation.mesures.mesuresGenerales
        .toutes()
        .find((mesure) => mesure.id === 'm1').rendueIndispensable
    ).to.be(true);
  });

  it('connaît ses mesures spécifiques', () => {
    const homologation = new Homologation({
      id: '123',
      mesuresSpecifiques: [{ description: 'Une mesure spécifique' }],
    });

    expect(homologation.mesuresSpecifiques().nombre()).to.equal(1);
  });

  it("sait décrire l'équipe de préparation du dossier", () => {
    const homologation = new Homologation({
      id: '123',
      rolesResponsabilites: { piloteProjet: 'Sylvie Martin' },
    });

    expect(homologation.descriptionEquipePreparation()).to.equal(
      'Sylvie Martin (fonction non renseignée)'
    );
  });

  it("sait décrire l'autorité d'homologation", () => {
    const homologation = new Homologation({
      id: '123',
      rolesResponsabilites: {
        autoriteHomologation: 'Jean Dupont',
        fonctionAutoriteHomologation: 'Maire',
      },
    });

    expect(homologation.descriptionAutoriteHomologation()).to.equal(
      'Jean Dupont (Maire)'
    );
  });

  it('décrit son expiration', () => {
    const referentiel = Referentiel.creeReferentiel({
      echeancesRenouvellement: { unAn: { expiration: 'Dans un an' } },
    });

    const homologation = new Homologation(
      {
        id: '123',
        avisExpertCyber: { dateRenouvellement: 'unAn' },
      },
      referentiel
    );

    expect(homologation.descriptionExpiration()).to.equal('Dans un an');
  });

  it('délègue aux mesures le calcul des statistiques', () => {
    let calculDelegueAuxMesures = false;

    const homologation = new Homologation({ id: '123', mesuresGenerales: [] });
    homologation.mesures.statistiques = () => (calculDelegueAuxMesures = true);

    homologation.statistiquesMesures();
    expect(calculDelegueAuxMesures).to.be(true);
  });

  describe('sur évaluation du statut de saisie des mesures', () => {
    const referentiel = Referentiel.creeReferentiel({
      mesures: { m1: {}, m2: {} },
    });
    const moteur = { mesures: () => ({ m1: {}, m2: {} }) };

    it('détecte que la liste des mesures reste à saisir', () => {
      const homologation = new Homologation({ id: '123' });
      expect(homologation.statutSaisie('mesures')).to.equal(
        InformationsHomologation.A_SAISIR
      );
    });

    it('détecte que la liste des mesures est à compléter', () => {
      const homologation = new Homologation(
        {
          mesuresGenerales: [{ id: 'm1', statut: MesureGenerale.STATUT_FAIT }],
        },
        referentiel,
        moteur
      );

      expect(homologation.statutSaisie('mesures')).to.equal(
        InformationsHomologation.A_COMPLETER
      );
    });

    it('détecte que la liste des mesures est complète', () => {
      const homologation = new Homologation(
        {
          mesuresGenerales: [
            { id: 'm1', statut: MesureGenerale.STATUT_FAIT },
            { id: 'm2', statut: MesureGenerale.STATUT_FAIT },
          ],
        },
        referentiel,
        moteur
      );

      expect(homologation.statutSaisie('mesures')).to.equal(
        InformationsHomologation.COMPLETES
      );
    });
  });

  describe('sur évaluation du statut de saisie des risques', () => {
    it('détecte que la liste des risques reste à vérifier', () => {
      const homologation = new Homologation({ id: '123' });
      expect(homologation.statutSaisie('risques')).to.equal(
        InformationsHomologation.A_SAISIR
      );
    });
  });

  it('connaît son indice cyber', () => {
    const homologation = new Homologation({
      createur: { email: 'bruno.dumans@mail.fr' },
    });
    homologation.mesures.indiceCyber = () => 3.7;

    expect(homologation.indiceCyber()).to.equal(3.7);
  });

  it('délègue aux mesures le calcul du nombre total de mesures générales', () => {
    const homologation = new Homologation({ mesuresGenerales: [] });
    homologation.mesures.nombreTotalMesuresGenerales = () => 42;

    expect(homologation.nombreTotalMesuresGenerales()).to.equal(42);
  });

  it('délègue aux statistiques le filtrage par mesures indispensables', () => {
    let statistiquesMesuresAppelees = false;
    const unObjet = {};

    const homologation = new Homologation({
      mesuresGenerales: [],
    });
    homologation.statistiquesMesures = () => ({
      indispensables: () => {
        statistiquesMesuresAppelees = true;
        return unObjet;
      },
    });

    expect(homologation.statistiquesMesuresIndispensables()).to.equal(unObjet);
    expect(statistiquesMesuresAppelees).to.be(true);
  });

  it('délègue aux statistiques le filtrage par mesures recommandées', () => {
    let statistiquesMesuresAppelees = false;
    const unObjet = {};

    const homologation = new Homologation({
      mesuresGenerales: [],
    });
    homologation.statistiquesMesures = () => ({
      recommandees: () => {
        statistiquesMesuresAppelees = true;
        return unObjet;
      },
    });

    expect(homologation.statistiquesMesuresRecommandees()).to.equal(unObjet);
    expect(statistiquesMesuresAppelees).to.be(true);
  });

  it('délègue aux statistiques le calcul du nombre de mesures à remplir toutes catégories confondues', () => {
    const homologation = new Homologation({ mesuresGenerales: [] });
    homologation.statistiquesMesures = () => ({
      aRemplirToutesCategories: () => 42,
    });

    const nombre = homologation.nombreTotalMesuresARemplirToutesCategories();

    expect(nombre).to.equal(42);
  });

  it('délègue aux mesures le calcul de la complétude des mesures', () => {
    const homologation = new Homologation({});

    homologation.mesures = {
      statistiques: () => ({
        completude: () => ({
          nombreTotalMesures: 10,
          nombreMesuresCompletes: 8,
        }),
      }),
      statutsMesuresPersonnalisees: () => [],
      indiceCyber: () => ({ total: 4.2 }),
    };

    const completude = homologation.completudeMesures();

    expect(completude).to.eql({
      nombreTotalMesures: 10,
      nombreMesuresCompletes: 8,
      detailMesures: [],
      indiceCyber: { total: 4.2 },
    });
  });

  it('délègue aux mesures le calcul du nombre de mesures spécifiques', () => {
    const homologation = new Homologation({ mesuresGenerales: [] });
    homologation.mesures.nombreMesuresSpecifiques = () => 42;

    expect(homologation.nombreMesuresSpecifiques()).to.equal(42);
  });

  it('délègue aux mesures la récupération des mesures par statut et par catégorie', () => {
    const homologation = new Homologation({
      mesuresGenerales: [{ id: 'mesure1', statut: 'enCours' }],
    });
    homologation.mesures.parStatutEtCategorie = () => ({ unStatut: {} });

    expect(homologation.mesuresParStatutEtCategorie()).to.eql({ unStatut: {} });
  });

  it('sait décrire le statut de déploiement', () => {
    const referentiel = Referentiel.creeReferentiel({
      statutsDeploiement: {
        enLigne: {
          description: 'En ligne',
        },
      },
    });

    const homologation = new Homologation(
      {
        id: '123',
        idUtilisateur: '456',
        descriptionService: { nomService: 'nom', statutDeploiement: 'enLigne' },
      },
      referentiel
    );

    expect(homologation.descriptionStatutDeploiement()).to.equal('En ligne');
  });

  it('connaît la localisation des données', () => {
    const referentiel = Referentiel.creeReferentiel({
      localisationsDonnees: {
        france: {
          description: 'France',
        },
      },
    });

    const homologation = new Homologation(
      {
        id: '123',
        idUtilisateur: '456',
        descriptionService: {
          nomService: 'nom',
          localisationDonnees: 'france',
        },
      },
      referentiel
    );

    expect(homologation.localisationDonnees()).to.equal('france');
  });

  it('sait décrire la localisation des données', () => {
    const referentiel = Referentiel.creeReferentiel({
      localisationsDonnees: {
        france: {
          description: 'France',
        },
      },
    });

    const homologation = new Homologation(
      {
        id: '123',
        idUtilisateur: '456',
        descriptionService: {
          nomService: 'nom',
          localisationDonnees: 'france',
        },
      },
      referentiel
    );

    expect(homologation.descriptionLocalisationDonnees()).to.equal('France');
  });

  it("récupère un objet de vue pour le pdf de l'annexe de la description", () => {
    const homologation = new Homologation({
      id: '123',
      idUtilisateur: '456',
      descriptionService: { nomService: 'nom' },
    });

    expect(homologation.vueAnnexePDFDescription()).to.be.a(
      VueAnnexePDFDescription
    );
  });

  it("récupère un objet de vue pour le pdf de l'annexe des risques", () => {
    const homologation = new Homologation({
      id: '123',
      idUtilisateur: '456',
      descriptionService: { nomService: 'nom' },
    });

    expect(homologation.vueAnnexePDFRisques()).to.be.a(VueAnnexePDFRisques);
  });

  it("récupère un objet de vue pour le pdf de l'annexe des mesures", () => {
    const homologation = new Homologation({
      id: '123',
      idUtilisateur: '456',
      descriptionService: { nomService: 'nom' },
    });

    expect(homologation.vueAnnexePDFMesures()).to.be.a(VueAnnexePDFMesures);
  });

  describe('sur requête des données à persister', () => {
    it("retourne une représentation correcte de l'ensemble de l'Homologation", () => {
      const referentiel = Referentiel.creeReferentiel({
        categoriesMesures: {},
        documentsHomologation: { decision: {} },
        echeancesRenouvellement: { unAn: {} },
        localisationsDonnees: { uneLocalisation: {} },
        mesures: { uneMesure: {} },
        reglesPersonnalisation: { mesuresBase: ['uneMesure'] },
        risques: { unRisque: {} },
        statutsDeploiement: { unStatutDeploiement: {} },
        statutsAvisDossierHomologation: { favorable: {} },
      });

      const aujourdhui = new Date();
      const homologation = new Homologation(
        {
          id: 'id-homologation',
          avisExpertCyber: { avis: 'defavorable' },
          descriptionService: uneDescriptionValide(
            Referentiel.creeReferentielVide()
          )
            .avecNomService('nom-service')
            .construis()
            .toJSON(),
          dossiers: [
            {
              ...unDossier(referentiel)
                .quiEstComplet()
                .avecDateHomologation(aujourdhui)
                .avecDateTelechargement(aujourdhui).donnees,
            },
          ],
          mesuresGenerales: [{ id: 'uneMesure', statut: 'fait' }],
          mesuresSpecifiques: [{ description: 'Une mesure spécifique' }],
          risquesGeneraux: [{ id: 'unRisque' }],
          risquesSpecifiques: [{ description: 'Un risque' }],
          rolesResponsabilites: {
            autoriteHomologation: 'Jean Dupont',
            partiesPrenantes: [{ nom: 'Un hébergeur', type: 'Hebergement' }],
          },
        },
        referentiel
      );

      expect(homologation.donneesAPersister().toutes()).to.eql({
        id: 'id-homologation',
        avisExpertCyber: { avis: 'defavorable' },
        descriptionService: {
          delaiAvantImpactCritique: 'unDelai',
          localisationDonnees: 'uneLocalisation',
          nomService: 'nom-service',
          presentation: 'Une présentation',
          provenanceService: 'uneProvenance',
          risqueJuridiqueFinancierReputationnel: false,
          statutDeploiement: 'unStatutDeploiement',
          donneesCaracterePersonnel: [],
          fonctionnalites: [],
          typeService: 'unType',
          donneesSensiblesSpecifiques: [],
          fonctionnalitesSpecifiques: [],
          pointsAcces: [],
          organisationsResponsables: ['ANSSI'],
        },
        dossiers: [
          {
            id: '1',
            avecAvis: true,
            avis: [
              {
                collaborateurs: ['Jean Dupond'],
                dureeValidite: 'unAn',
                statut: 'favorable',
              },
            ],
            avecDocuments: true,
            documents: ['unDocument'],
            autorite: { nom: 'Jean Dupond', fonction: 'RSSI' },
            decision: {
              dateHomologation: aujourdhui.toISOString(),
              dureeValidite: 'unAn',
            },
            dateTelechargement: { date: aujourdhui.toISOString() },
            finalise: true,
          },
        ],
        mesuresGenerales: [{ id: 'uneMesure', statut: 'fait' }],
        mesuresSpecifiques: [{ description: 'Une mesure spécifique' }],
        risquesGeneraux: [{ id: 'unRisque' }],
        risquesSpecifiques: [{ description: 'Un risque' }],
        rolesResponsabilites: {
          acteursHomologation: [],
          autoriteHomologation: 'Jean Dupont',
          partiesPrenantes: [{ nom: 'Un hébergeur', type: 'Hebergement' }],
        },
      });
    });
  });

  describe('sur une demande des données à dupliquer', () => {
    const referentiel = Referentiel.creeReferentielVide();
    const descriptionService = uneDescriptionValide(referentiel)
      .construis()
      .toJSON();

    it('retourne les données sans identifiant', () => {
      const homologation = new Homologation(
        { id: 'id-homologation', descriptionService },
        referentiel
      );

      const duplicata = homologation.donneesADupliquer();

      expect(duplicata.id).to.be(undefined);
    });

    it("utilise le nom d'homologation passé en paramètre", () => {
      const homologation = new Homologation(
        { id: 'id-homologation', descriptionService },
        referentiel
      );

      const duplicata = homologation.donneesADupliquer('Nouveau service');

      expect(duplicata.descriptionService.nomService).to.equal(
        'Nouveau service'
      );
    });

    it("ne duplique pas les dossiers de l'homologation", () => {
      const homologation = new Homologation(
        {
          id: 'id-homologation',
          descriptionService,
          dossiers: [{ id: '999' }],
        },
        referentiel
      );

      const duplicata = homologation.donneesADupliquer();

      expect(duplicata.dossiers).to.be(undefined);
    });
  });

  describe('sur demande de finalisation du dossier courant', () => {
    it('délègue aux Dossiers la responsabilité', () => {
      const referentiel = Referentiel.creeReferentielVide();
      const descriptionService = uneDescriptionValide(referentiel)
        .construis()
        .toJSON();
      let appelDelegue = false;

      const homologation = new Homologation(
        {
          id: '123',
          descriptionService,
        },
        referentiel
      );
      homologation.dossiers.finaliseDossierCourant = () => {
        appelDelegue = true;
      };

      homologation.finaliseDossierCourant();

      expect(appelDelegue).to.be(true);
    });
  });
});
