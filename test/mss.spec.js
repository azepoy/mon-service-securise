const axios = require('axios');
const expect = require('expect.js');

const { ErreurUtilisateurExistant } = require('../src/erreurs');
const MSS = require('../src/mss');
const Referentiel = require('../src/referentiel');
const DepotDonnees = require('../src/depotDonnees');
const Homologation = require('../src/modeles/homologation');

describe('Le serveur MSS', () => {
  let idUtilisateurCourant;
  let suppressionCookieEffectuee;
  let verificationJWTMenee;
  let verificationCGUMenee;
  let authentificationBasiqueMenee;
  let rechercheHomologationEffectuee;

  const verifieRequeteChangeEtat = (etat, requete, done) => {
    expect(etat()).to.be(false);

    axios(requete)
      .then(() => {
        expect(etat()).to.be(true);
        done();
      })
      .catch((erreur) => {
        const erreurHTTP = erreur.response && erreur.response.status;
        if (erreurHTTP >= 400 && erreurHTTP < 500) {
          expect(etat()).to.be(true);
          done();
        } else throw erreur;
      })
      .catch(done);
  };

  const verifieRequeteExigeSuppressionCookie = (...params) => {
    verifieRequeteChangeEtat(() => suppressionCookieEffectuee, ...params);
  };

  const verifieRequeteExigeJWT = (...params) => {
    verifieRequeteChangeEtat(() => verificationJWTMenee, ...params);
  };

  const verifieRequeteExigeAcceptationCGU = (...params) => {
    verifieRequeteChangeEtat(() => verificationCGUMenee, ...params);
  };

  const verifieRequeteExigeAuthentificationBasique = (...params) => {
    verifieRequeteChangeEtat(() => authentificationBasiqueMenee, ...params);
  };

  const verifieRechercheHomologation = (...params) => {
    verifieRequeteChangeEtat(() => rechercheHomologationEffectuee, ...params);
  };

  const verifieJetonDepose = (reponse, done) => {
    expect(reponse.headers['set-cookie'][0]).to.match(
      /^token=.+; path=\/; expires=.+; samesite=strict; httponly$/
    );
    done();
  };

  const middleware = {
    suppressionCookie: (requete, reponse, suite) => {
      suppressionCookieEffectuee = true;
      suite();
    },

    verificationJWT: (requete, reponse, suite) => {
      requete.idUtilisateurCourant = idUtilisateurCourant;
      verificationJWTMenee = true;
      suite();
    },

    verificationAcceptationCGU: (requete, reponse, suite) => {
      requete.idUtilisateurCourant = idUtilisateurCourant;
      verificationCGUMenee = true;
      suite();
    },

    authentificationBasique: (requete, reponse, suite) => {
      authentificationBasiqueMenee = true;
      suite();
    },

    trouveHomologation: (requete, reponse, suite) => {
      requete.homologation = new Homologation({ id: '456' });
      rechercheHomologationEffectuee = true;
      suite();
    },
  };

  let adaptateurMail;
  let depotDonnees;
  let referentiel;
  let serveur;

  beforeEach((done) => {
    idUtilisateurCourant = undefined;
    suppressionCookieEffectuee = false;
    verificationJWTMenee = false;
    verificationCGUMenee = false;
    authentificationBasiqueMenee = false;
    rechercheHomologationEffectuee = false;

    depotDonnees = DepotDonnees.creeDepotVide();
    referentiel = Referentiel.creeReferentielVide();
    adaptateurMail = { envoieMessageResetMotDePasse: () => {} };
    serveur = MSS.creeServeur(depotDonnees, middleware, referentiel, adaptateurMail, false);
    serveur.ecoute(1234, done);
  });

  afterEach(() => { serveur.arreteEcoute(); });

  it('sert des pages HTML', (done) => {
    axios.get('http://localhost:1234/')
      .then((reponse) => {
        expect(reponse.status).to.equal(200);
        done();
      })
      .catch(done);
  });

  describe('quand requête GET sur `/connexion`', () => {
    it("déconnecte l'utilisateur courant", (done) => {
      verifieRequeteExigeSuppressionCookie('http://localhost:1234/connexion', done);
    });
  });

  describe('quand requête GET sur `/finalisationInscription/:idReset`', () => {
    it('dépose le jeton dans un cookie', (done) => {
      const utilisateur = { genereToken: () => 'un token', accepteCGU: () => false };

      depotDonnees.utilisateurAFinaliser = (idReset) => {
        expect(idReset).to.equal('999');
        return utilisateur;
      };

      depotDonnees.utilisateur = () => utilisateur;

      axios.get('http://localhost:1234/finalisationInscription/999')
        .then((reponse) => verifieJetonDepose(reponse, done))
        .catch(done);
    });
  });

  describe('quand requête GET sur `/admin/inscription`', () => {
    it("verrouille l'accès par une authentification basique", (done) => {
      verifieRequeteExigeAuthentificationBasique('http://localhost:1234/admin/inscription', done);
    });
  });

  describe('quand requête GET sur `/api/homologations`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      verifieRequeteExigeAcceptationCGU(
        { method: 'get', url: 'http://localhost:1234/api/homologations' }, done
      );
    });

    it("interroge le dépôt de données pour récupérer les homologations de l'utilisateur", (done) => {
      idUtilisateurCourant = '123';

      const homologation = { toJSON: () => ({ id: '456' }) };
      depotDonnees.homologations = (idUtilisateur) => {
        expect(idUtilisateur).to.equal('123');
        return [homologation];
      };

      axios.get('http://localhost:1234/api/homologations')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);

          const { homologations } = reponse.data;
          expect(homologations.length).to.equal(1);
          expect(homologations[0].id).to.equal('456');
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête GET sur `/homologations`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      verifieRequeteExigeAcceptationCGU('http://localhost:1234/homologations', done);
    });
  });

  describe('quand requête GET sur `/homologation/:id`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456', done);
    });
  });

  describe('quand requête GET sur `/homologation/:id/edition`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456/edition', done);
    });
  });

  describe('quand requête GET sur `/homologation/:id/caracteristiquesComplementaires`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456/caracteristiquesComplementaires', done);
    });
  });

  describe('quand requête GET sur `/homologation/:id/decision`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456/decision', done);
    });
  });

  describe('quand requête GET sur `/homologation/:id/mesures`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456/mesures', done);
    });
  });

  describe('quand requete GET sur `/homologation/:id/partiesPrenantes`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456/partiesPrenantes', done);
    });
  });

  describe('quand requête GET sur `/homologation/:id/risques`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456/risques', done);
    });
  });

  describe('quand requête GET sur `/homologation/:id/avisExpertCyber`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation('http://localhost:1234/homologation/456/avisExpertCyber', done);
    });
  });

  describe('quand requête POST sur `/api/homologation`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      verifieRequeteExigeAcceptationCGU(
        { method: 'post', url: 'http://localhost:1234/api/homologation' }, done
      );
    });

    it('retourne une erreur HTTP 422 si données insuffisantes pour création homologation', (done) => {
      axios.post('http://localhost:1234/api/homologation', {})
        .then(() => done('Réponse HTTP OK inattendue'))
        .catch((erreur) => {
          expect(erreur.response.status).to.equal(422);
          expect(erreur.response.data).to.equal("Données insuffisantes pour créer l'homologation");
          done();
        })
        .catch(done);
    });

    it("demande au dépôt de données d'enregistrer les nouvelles homologations", (done) => {
      idUtilisateurCourant = '123';

      depotDonnees.nouvelleHomologation = (idUtilisateur, donneesHomologation) => {
        expect(idUtilisateur).to.equal('123');
        expect(donneesHomologation).to.eql({
          nomService: 'Super Service',
          natureService: undefined,
          provenanceService: undefined,
          dejaMisEnLigne: undefined,
          fonctionnalites: undefined,
          donneesCaracterePersonnel: undefined,
          delaiAvantImpactCritique: undefined,
          presenceResponsable: undefined,
        });
        return '456';
      };

      axios.post('http://localhost:1234/api/homologation', { nomService: 'Super Service' })
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idHomologation: '456' });
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête PUT sur `/api/homologation/:id`', () => {
    beforeEach(() => {
      depotDonnees.metsAJourHomologation = () => {};
    });

    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation(
        { method: 'put', url: 'http://localhost:1234/api/homologation/456' }, done
      );
    });

    it("demande au dépôt de données de mettre à jour l'homologation", (done) => {
      idUtilisateurCourant = '123';

      depotDonnees.metsAJourHomologation = (identifiant, donneesHomologation) => {
        expect(identifiant).to.equal('456');
        expect(donneesHomologation.nomService).to.equal('Nouveau Nom');
        return '456';
      };

      axios.put('http://localhost:1234/api/homologation/456', { nomService: 'Nouveau Nom' })
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idHomologation: '456' });
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête POST sur `/api/homologation/:id/caracteristiquesComplementaires', () => {
    beforeEach(() => (depotDonnees.ajouteCaracteristiquesAHomologation = () => {}));

    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation({
        method: 'post',
        url: 'http://localhost:1234/api/homologation/456/caracteristiquesComplementaires',
      }, done);
    });

    it("demande au dépôt d'associer les caractéristiques à l'homologation", (done) => {
      let caracteristiquesAjoutees = false;

      depotDonnees.ajouteCaracteristiquesAHomologation = (idHomologation, caracteristiques) => {
        expect(idHomologation).to.equal('456');
        expect(caracteristiques.presentation).to.equal('Une présentation');
        caracteristiquesAjoutees = true;
      };

      axios.post('http://localhost:1234/api/homologation/456/caracteristiquesComplementaires', {
        presentation: 'Une présentation',
      })
        .then((reponse) => {
          expect(caracteristiquesAjoutees).to.be(true);
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idHomologation: '456' });
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête POST sur `/api/homologation/:id/mesures', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation({
        method: 'post',
        url: 'http://localhost:1234/api/homologation/456/mesures',
      }, done);
    });

    it("demande au dépôt d'associer les mesures à l'homologation", (done) => {
      referentiel.recharge({ mesures: { identifiantMesure: {} } });
      let mesureAjoutee = false;

      depotDonnees.ajouteMesureAHomologation = (idHomologation, mesure) => {
        expect(idHomologation).to.equal('456');
        expect(mesure.id).to.equal('identifiantMesure');
        expect(mesure.statut).to.equal('fait');
        expect(mesure.modalites).to.equal("Des modalités d'application");
        mesureAjoutee = true;
      };

      axios.post('http://localhost:1234/api/homologation/456/mesures', {
        identifiantMesure: 'fait',
        'modalites-identifiantMesure': "Des modalités d'application",
      })
        .then((reponse) => {
          expect(mesureAjoutee).to.be(true);
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idHomologation: '456' });
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête POST sur `/api/homologation/:id/partiesPrenantes`', () => {
    beforeEach(() => (depotDonnees.ajoutePartiesPrenantesAHomologation = () => {}));

    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation({
        method: 'post',
        url: 'http://localhost:1234/api/homologation/456/partiesPrenantes',
      }, done);
    });

    it("demande au dépôt d'associer les parties prenantes à l'homologation", (done) => {
      let partiesPrenantesAjoutees = false;

      depotDonnees.ajoutePartiesPrenantesAHomologation = (idHomologation, pp) => {
        expect(idHomologation).to.equal('456');
        expect(pp.autoriteHomologation).to.equal('Jean Dupont');
        partiesPrenantesAjoutees = true;
      };

      axios.post('http://localhost:1234/api/homologation/456/partiesPrenantes', {
        autoriteHomologation: 'Jean Dupont',
      })
        .then((reponse) => {
          expect(partiesPrenantesAjoutees).to.be(true);
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idHomologation: '456' });
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête POST sur `/api/homologation/:id/risques`', () => {
    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation({
        method: 'post',
        url: 'http://localhost:1234/api/homologation/456/risques',
      }, done);
    });

    it("demande au dépôt d'associer les risques à l'homologation", (done) => {
      referentiel.recharge({ risques: { unRisque: {} } });
      let risqueAjoute = false;

      depotDonnees.ajouteRisqueAHomologation = (idHomologation, risque) => {
        expect(idHomologation).to.equal('456');
        expect(risque.id).to.equal('unRisque');
        expect(risque.commentaire).to.equal('Un commentaire');
        risqueAjoute = true;
      };

      axios.post('http://localhost:1234/api/homologation/456/risques', {
        'commentaire-unRisque': 'Un commentaire',
      })
        .then((reponse) => {
          expect(risqueAjoute).to.be(true);
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idHomologation: '456' });
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête POST sur `/api/homologation/:id/avisExpertCyber`', () => {
    beforeEach(() => (depotDonnees.ajouteAvisExpertCyberAHomologation = () => {}));

    it("recherche l'homologation correspondante", (done) => {
      verifieRechercheHomologation({
        method: 'post',
        url: 'http://localhost:1234/api/homologation/456/avisExpertCyber',
      }, done);
    });

    it("demande au dépôt d'associer l'avis d'expert à l'homologation", (done) => {
      let avisAjoute = false;

      depotDonnees.ajouteAvisExpertCyberAHomologation = (idHomologation, avis) => {
        expect(idHomologation).to.equal('456');
        expect(avis.commentaire).to.equal('Un commentaire');
        avisAjoute = true;
      };

      axios.post('http://localhost:1234/api/homologation/456/avisExpertCyber', {
        commentaire: 'Un commentaire',
      })
        .then((reponse) => {
          expect(avisAjoute).to.be(true);
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idHomologation: '456' });
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête GET sur `/utilisateur/edition`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      depotDonnees.utilisateur = () => ({ accepteCGU: () => true });
      verifieRequeteExigeJWT('http://localhost:1234/utilisateur/edition', done);
    });
  });

  describe('quand requête POST sur `/api/utilisateur`', () => {
    const utilisateur = { id: '123', genereToken: () => 'un token' };

    it("demande au dépôt de créer l'utilisateur", (done) => {
      const donneesRequete = { prenom: 'Jean', nom: 'Dupont', email: 'jean.dupont@mail.fr' };

      depotDonnees.nouvelUtilisateur = (donneesUtilisateur) => {
        expect(donneesUtilisateur).to.eql(donneesRequete);
        return new Promise((resolve) => resolve(utilisateur));
      };

      axios.post('http://localhost:1234/api/utilisateur', donneesRequete)
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idUtilisateur: '123' });
          done();
        })
        .catch(done);
    });

    it("envoie un message de notification à l'utilisateur créé", (done) => {
      depotDonnees.nouvelUtilisateur = () => new Promise((resolve) => resolve(utilisateur));

      utilisateur.email = 'jean.dupont@mail.fr';
      utilisateur.idResetMotDePasse = '999';

      adaptateurMail.envoieMessageResetMotDePasse = (destinataire, idResetMotDePasse) => {
        expect(destinataire).to.equal('jean.dupont@mail.fr');
        expect(idResetMotDePasse).to.equal('999');
        done();
      };

      axios.post('http://localhost:1234/api/utilisateur', { desDonnees: 'des donnees' })
        .catch(done);
    });

    it("génère une erreur HTTP 422 si l'utilisateur existe déjà", (done) => {
      depotDonnees.nouvelUtilisateur = () => { throw new ErreurUtilisateurExistant(); };

      axios.post('http://localhost:1234/api/utilisateur', { desDonnees: 'des donnees' })
        .then(() => done('Reponse HTTP OK inattendue'))
        .catch((erreur) => {
          expect(erreur.response.status).to.equal(422);
          expect(erreur.response.data).to.equal('Utilisateur déjà existant pour cette adresse email.');
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête PUT sur `/api/utilisateur`', () => {
    let utilisateur;

    beforeEach(() => {
      utilisateur = { id: '123', genereToken: () => 'un token', accepteCGU: () => true };
      depotDonnees.metsAJourMotDePasse = () => new Promise((resolve) => resolve(utilisateur));
      depotDonnees.utilisateur = () => utilisateur;
      depotDonnees.valideAcceptationCGUPourUtilisateur = () => utilisateur;
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      verifieRequeteExigeJWT(
        { method: 'put', url: 'http://localhost:1234/api/utilisateur' }, done
      );
    });

    describe("lorsque l'utilisateur a déjà accepté les CGU", () => {
      it("met à jour le mot de passe de l'utilisateur", (done) => {
        idUtilisateurCourant = utilisateur.id;

        depotDonnees.metsAJourMotDePasse = (idUtilisateur, motDePasse) => new Promise(
          (resolve) => {
            expect(idUtilisateur).to.equal('123');
            expect(motDePasse).to.equal('mdp_12345');
            resolve(utilisateur);
          }
        );

        axios.put('http://localhost:1234/api/utilisateur', { motDePasse: 'mdp_12345' })
          .then((reponse) => {
            expect(reponse.status).to.equal(200);
            expect(reponse.data).to.eql({ idUtilisateur: '123' });
            done();
          })
          .catch(done);
      });

      it('pose un nouveau cookie', (done) => {
        axios.put('http://localhost:1234/api/utilisateur', { motDePasse: 'mdp_12345' })
          .then((reponse) => verifieJetonDepose(reponse, done))
          .catch(done);
      });
    });

    describe("lorsque utilisateur n'a pas encore accepté les CGU", () => {
      beforeEach(() => (utilisateur.accepteCGU = () => false));

      it('met à jour le mot de passe si case CGU cochée dans formulaire', (done) => {
        let motDePasseMisAJour = false;
        depotDonnees.metsAJourMotDePasse = () => new Promise((resolve) => {
          motDePasseMisAJour = true;
          resolve(utilisateur);
        });

        expect(motDePasseMisAJour).to.be(false);
        axios.put('http://localhost:1234/api/utilisateur', { cguAcceptees: true, motDePasse: 'mdp_12345' })
          .then(() => {
            expect(motDePasseMisAJour).to.be(true);
            done();
          })
          .catch(done);
      });

      it("indique que l'utilisateur a coché la case CGU dans le formulaire", (done) => {
        idUtilisateurCourant = utilisateur.id;

        depotDonnees.valideAcceptationCGUPourUtilisateur = (u) => {
          expect(u.id).to.equal('123');
          return u;
        };

        axios.put('http://localhost:1234/api/utilisateur', { cguAcceptees: true, motDePasse: 'mdp_12345' })
          .then(() => done())
          .catch(done);
      });

      it("retourne une erreur HTTP 422 si la case CGU du formulaire n'est pas cochée", (done) => {
        axios.put('http://localhost:1234/api/utilisateur', { cguAcceptees: false, motDePasse: 'mdp_12345' })
          .then(() => done('réponse HTTP OK inattendue'))
          .catch((erreur) => {
            expect(erreur.response.status).to.equal(422);
            expect(erreur.response.data).to.equal('CGU non acceptées');
            done();
          })
          .catch(done);
      });
    });
  });

  describe('quand requête POST sur `/api/token`', () => {
    describe("avec authentification réussie de l'utilisateur", () => {
      beforeEach(() => {
        const utilisateur = {
          toJSON: () => ({ prenomNom: 'Jean Dupont' }),
          genereToken: () => 'un token',
        };

        depotDonnees.utilisateurAuthentifie = (login, motDePasse) => new Promise(
          (resolve) => {
            expect(login).to.equal('jean.dupont@mail.fr');
            expect(motDePasse).to.equal('mdp_12345');
            resolve(utilisateur);
          }
        );
      });

      it("retourne les informations de l'utilisateur", (done) => {
        axios.post('http://localhost:1234/api/token', { login: 'jean.dupont@mail.fr', motDePasse: 'mdp_12345' })
          .then((reponse) => {
            expect(reponse.status).to.equal(200);
            expect(reponse.data).to.eql({ utilisateur: { prenomNom: 'Jean Dupont' } });
            done();
          })
          .catch(done);
      });

      it('pose un cookie', (done) => {
        axios.post('http://localhost:1234/api/token', { login: 'jean.dupont@mail.fr', motDePasse: 'mdp_12345' })
          .then((reponse) => verifieJetonDepose(reponse, done))
          .catch(done);
      });

      it("retourne les infos de l'utilisateur", (done) => {
        axios.post('http://localhost:1234/api/token', { login: 'jean.dupont@mail.fr', motDePasse: 'mdp_12345' })
          .then((reponse) => {
            expect(reponse.data).to.eql({ utilisateur: { prenomNom: 'Jean Dupont' } });
            done();
          })
          .catch(done);
      });
    });

    describe("avec échec de l'authentification de l'utilisateur", () => {
      before(() => (
        depotDonnees.utilisateurAuthentifie = () => new Promise(
          (resolve) => resolve(undefined)
        )
      ));

      it('retourne un HTTP 401', (done) => {
        axios.post('http://localhost:1234/api/token', { login: 'jean.dupont@mail.fr', motDePasse: 'mdp_12345' })
          .then(() => done('Réponse OK inattendue.'))
          .catch((erreur) => {
            expect(erreur.response.status).to.equal(401);
            expect(erreur.response.data).to.equal("L'authentification a échoué.");
            done();
          })
          .catch(done);
      });
    });
  });
});
