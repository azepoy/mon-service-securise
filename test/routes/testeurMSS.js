const axios = require('axios');
const expect = require('expect.js');

const { depotVide } = require('../depots/depotVide');
const adaptateurGestionErreurVide = require('../../src/adaptateurs/adaptateurGestionErreurVide');
const adaptateurHorlogeParDefaut = require('../../src/adaptateurs/adaptateurHorloge');
const adaptateurMailMemoire = require('../../src/adaptateurs/adaptateurMailMemoire');
const MoteurRegles = require('../../src/moteurRegles');
const MSS = require('../../src/mss');
const Referentiel = require('../../src/referentiel');

const middleware = require('../mocks/middleware');

const testeurMss = () => {
  let adaptateurAnnuaire;
  let adaptateurHorloge;
  let adaptateurMail;
  let adaptateurPdf;
  let adaptateurCsv;
  let adaptateurZip;
  let adaptateurTracking;
  let depotDonnees;
  let moteurRegles;
  let referentiel;
  let serveur;

  const verifieJetonDepose = (reponse, suite) => {
    const valeurHeader = reponse.headers['set-cookie'][0];
    expect(valeurHeader).to.match(
      /^token=.+; path=\/; expires=.+; samesite=strict; httponly$/
    );
    suite();
  };

  const verifieRequeteGenereErreurHTTP = (
    status,
    messageErreur,
    requete,
    suite
  ) => {
    axios(requete)
      .then(() => suite('Réponse OK inattendue'))
      .catch((erreur) => {
        expect(erreur.response.status).to.equal(status);
        expect(erreur.response.data).to.eql(messageErreur);
        suite();
      })
      .catch(suite);
  };

  const initialise = (done) => {
    adaptateurAnnuaire = {};
    adaptateurHorloge = adaptateurHorlogeParDefaut;
    adaptateurMail = adaptateurMailMemoire;
    adaptateurPdf = {
      genereAnnexes: () => Promise.resolve('PDF Annexe'),
      genereDossierDecision: () => Promise.resolve('PDF Dossier decision'),
      genereSyntheseSecurite: () => Promise.resolve('PDF Synthese securite'),
    };
    adaptateurCsv = {};
    adaptateurZip = { genereArchive: () => Promise.resolve('Archive ZIP') };
    adaptateurTracking = {
      envoieTrackingConnexion: () => Promise.resolve(),
      envoieTrackingInscription: () => Promise.resolve(),
      envoieTrackingInvitationContributeur: () => Promise.resolve(),
      envoieTrackingNouveauServiceCree: () => Promise.resolve(),
    };
    middleware.reinitialise({});
    referentiel = Referentiel.creeReferentielVide();
    moteurRegles = new MoteurRegles(referentiel);
    depotVide()
      .then((depot) => {
        depotDonnees = depot;
        serveur = MSS.creeServeur(
          depotDonnees,
          middleware,
          referentiel,
          moteurRegles,
          adaptateurMail,
          adaptateurPdf,
          adaptateurHorloge,
          adaptateurGestionErreurVide,
          adaptateurAnnuaire,
          adaptateurCsv,
          adaptateurZip,
          adaptateurTracking,
          false,
          false,
          false
        );
        serveur.ecoute(1234, done);
      })
      .catch(done);
  };

  const arrete = () => serveur.arreteEcoute();

  return {
    adaptateurAnnuaire: () => adaptateurAnnuaire,
    adaptateurHorloge: () => adaptateurHorloge,
    adaptateurMail: () => adaptateurMail,
    adaptateurPdf: () => adaptateurPdf,
    adaptateurCsv: () => adaptateurCsv,
    adaptateurZip: () => adaptateurZip,
    adaptateurTracking: () => adaptateurTracking,
    depotDonnees: () => depotDonnees,
    middleware: () => middleware,
    moteurRegles: () => moteurRegles,
    referentiel: () => referentiel,
    arrete,
    initialise,
    verifieRequeteGenereErreurHTTP,
    verifieJetonDepose,
  };
};

module.exports = testeurMss;
