const expect = require('expect.js');

const fauxAdaptateurChiffrement = require('../mocks/adaptateurChiffrement');
const {
  unePersistanceMemoire,
} = require('../constructeurs/constructeurAdaptateurPersistanceMemoire');
const AdaptateurJournalMSSMemoire = require('../../src/adaptateurs/adaptateurJournalMSSMemoire');
const AdaptateurPersistanceMemoire = require('../../src/adaptateurs/adaptateurPersistanceMemoire');
const DepotDonneesAutorisations = require('../../src/depots/depotDonneesAutorisations');
const DepotDonneesUtilisateurs = require('../../src/depots/depotDonneesUtilisateurs');
const {
  ErreurEmailManquant,
  ErreurSuppressionImpossible,
  ErreurUtilisateurExistant,
  ErreurUtilisateurInexistant,
} = require('../../src/erreurs');
const Utilisateur = require('../../src/modeles/utilisateur');

describe('Le dépôt de données des utilisateurs', () => {
  let adaptateurJWT;
  let adaptateurChiffrement;

  beforeEach(() => {
    adaptateurJWT = 'Un adaptateur';
    adaptateurChiffrement = fauxAdaptateurChiffrement();
  });

  it("retourne l'utilisateur authentifié", async () => {
    adaptateurChiffrement = {
      hacheBCrypt: async (chaine) => {
        expect(chaine).to.equal('mdp_12345');
        return '12345-chiffré';
      },
      compareBCrypt: async (chaine1, chaine2) => {
        expect(chaine1).to.equal('mdp_12345');
        expect(chaine2).to.equal('12345-chiffré');
        return true;
      },
    };

    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurJWT,
      adaptateurPersistance: unePersistanceMemoire()
        .ajouteUnUtilisateur({
          id: '123',
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
          motDePasse: '12345-chiffré',
        })
        .construis(),
    });

    const utilisateur = await depot.utilisateurAuthentifie(
      'jean.dupont@mail.fr',
      'mdp_12345'
    );

    expect(utilisateur).to.be.an(Utilisateur);
    expect(utilisateur.id).to.equal('123');
    expect(utilisateur.adaptateurJWT).to.equal(adaptateurJWT);
  });

  it("met à jour le mot de passe d'un utilisateur", async () => {
    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurJWT,
      adaptateurPersistance: unePersistanceMemoire()
        .ajouteUnUtilisateur({
          id: '123',
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
          motDePasse: 'mdp_origine-chiffré',
        })
        .construis(),
    });

    const avant = await depot.utilisateurAuthentifie(
      'jean.dupont@mail.fr',
      'mdp_12345'
    );
    expect(typeof avant).to.be('undefined');

    const misAJour = await depot.metsAJourMotDePasse('123', 'mdp_12345');
    expect(misAJour).to.be.an(Utilisateur);
    expect(misAJour.id).to.equal('123');
    expect(misAJour.adaptateurJWT).to.equal(adaptateurJWT);

    const apres = await depot.utilisateurAuthentifie(
      'jean.dupont@mail.fr',
      'mdp_12345'
    );
    expect(apres.id).to.equal('123');
  });

  describe('sur demande de mise à jour des informations du profil utilisateur', () => {
    let depot;
    let adaptateurJournalMSS;

    beforeEach(() => {
      adaptateurJournalMSS = AdaptateurJournalMSSMemoire.nouvelAdaptateur();
      depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurChiffrement,
        adaptateurJournalMSS,
        adaptateurPersistance: unePersistanceMemoire()
          .ajouteUnUtilisateur({
            id: '123',
            prenom: 'Jean',
            nom: 'Dupont',
            email: 'jean.dupont@mail.fr',
          })
          .construis(),
      });
    });

    it('met les informations à jour', async () => {
      await depot.metsAJourUtilisateur('123', {
        prenom: 'Jérôme',
        nom: 'Dubois',
      });
      const u = await depot.utilisateur('123');
      expect(u.prenom).to.equal('Jérôme');
      expect(u.nom).to.equal('Dubois');
    });

    it('ignore les demandes de changement de mot de passe', async () => {
      await depot.metsAJourMotDePasse('123', 'mdp_12345');
      await depot.metsAJourUtilisateur('123', {
        nom: 'Dubois',
        motDePasse: 'non pris en compte',
      });

      const u = await depot.utilisateurAuthentifie(
        'jean.dupont@mail.fr',
        'mdp_12345'
      );

      if (!u)
        throw new Error(
          "Le dépôt aurait dû authentifier l'utilisateur avec le mot de passe inchangé"
        );
      expect(u.id).to.equal('123');
    });

    it('consigne un événement de profil utilisateur modifié', async () => {
      let evenementRecu;
      adaptateurJournalMSS.consigneEvenement = async (evenenement) => {
        evenementRecu = evenenement;
      };

      await depot.metsAJourUtilisateur('123', {
        prenom: 'Jérôme',
        nom: 'Dubois',
      });

      expect(evenementRecu.type).to.equal('PROFIL_UTILISATEUR_MODIFIE');
    });
  });

  it("retient qu'un utilisateur accepte les CGU", (done) => {
    const adaptateurPersistance = AdaptateurPersistanceMemoire.nouvelAdaptateur(
      {
        utilisateurs: [
          {
            id: '123',
            prenom: 'Jean',
            nom: 'Dupont',
            email: 'jean.dupont@mail.fr',
            motDePasse: 'XXX',
          },
        ],
      }
    );
    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurPersistance,
    });

    depot
      .utilisateur('123')
      .then((utilisateur) => {
        expect(utilisateur.accepteCGU()).to.be(false);
        return utilisateur;
      })
      .then(depot.valideAcceptationCGUPourUtilisateur)
      .then(() => depot.utilisateur('123'))
      .then((utilisateur) => expect(utilisateur.accepteCGU()).to.be(true))
      .then(() => done())
      .catch(done);
  });

  it('sait si un utilisateur existe', async () => {
    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurJWT,
      adaptateurPersistance: unePersistanceMemoire()
        .ajouteUnUtilisateur({
          id: '123',
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
          motDePasse: 'XXX',
        })
        .construis(),
    });

    const connait123 = await depot.utilisateurExiste('123');
    expect(connait123).to.be(true);
    const connait999 = await depot.utilisateurExiste('999');
    expect(connait999).to.be(false);
  });

  it("retourne l'utilisateur associé à un identifiant donné", async () => {
    const adaptateurPersistance = AdaptateurPersistanceMemoire.nouvelAdaptateur(
      {
        utilisateurs: [
          {
            id: '123',
            prenom: 'Jean',
            nom: 'Dupont',
            email: 'jean.dupont@mail.fr',
            motDePasse: 'XXX',
          },
        ],
      }
    );
    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurJWT,
      adaptateurPersistance,
    });

    const utilisateur = await depot.utilisateur('123');

    expect(utilisateur).to.be.an(Utilisateur);
    expect(utilisateur.id).to.equal('123');
    expect(utilisateur.adaptateurJWT).to.equal(adaptateurJWT);
  });

  it('retourne tous les utilisateurs enregistrés', (done) => {
    const adaptateurPersistance = AdaptateurPersistanceMemoire.nouvelAdaptateur(
      {
        utilisateurs: [
          {
            id: '123',
            prenom: 'Jean',
            nom: 'Dupont',
            email: 'jean.dupont@mail.fr',
            motDePasse: 'XXX',
          },
          {
            id: '456',
            prenom: 'Murielle',
            nom: 'Renard',
            email: 'mr@mail.fr',
            motDePasse: 'ZZZ',
          },
        ],
      }
    );
    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurJWT,
      adaptateurPersistance,
    });

    depot
      .tousUtilisateurs()
      .then((tous) => {
        expect(tous.map((u) => u.id)).to.eql(['123', '456']);
        expect(tous[0]).to.be.an(Utilisateur);
        expect(tous[1]).to.be.an(Utilisateur);
        done();
      })
      .catch(done);
  });

  it("retourne l'utilisateur avec sa date de création", (done) => {
    const date = new Date(2000, 1, 1, 12, 0);
    const adaptateurPersistance = AdaptateurPersistanceMemoire.nouvelAdaptateur(
      {
        utilisateurs: [
          {
            id: '123',
            prenom: 'Jean',
            nom: 'Dupont',
            email: 'jean.dupont@mail.fr',
            motDePasse: 'XXX',
            dateCreation: date,
          },
        ],
      }
    );
    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurJWT,
      adaptateurPersistance,
    });

    depot
      .utilisateur('123')
      .then((utilisateur) => {
        expect(utilisateur).to.be.an(Utilisateur);
        expect(utilisateur.id).to.equal('123');
        expect(utilisateur.dateCreation).to.eql(date);
        done();
      })
      .catch(done);
  });

  it("retourne l'utilisateur associé à un identifiant reset de mot de passe", async () => {
    const depot = DepotDonneesUtilisateurs.creeDepot({
      adaptateurChiffrement,
      adaptateurJWT,
      adaptateurPersistance: unePersistanceMemoire()
        .ajouteUnUtilisateur({
          id: '123',
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
          idResetMotDePasse: '999',
        })
        .construis(),
    });

    const utilisateur = await depot.utilisateurAFinaliser('999');

    expect(utilisateur).to.be.an(Utilisateur);
    expect(utilisateur.id).to.equal('123');
    expect(utilisateur.adaptateurJWT).to.equal(adaptateurJWT);
  });

  describe("sur réception d'une demande d'enregistrement d'un nouvel utilisateur", () => {
    let depot;

    describe("quand l'utilisateur n'existe pas déjà", () => {
      const adaptateurHorloge = {};
      let adaptateurJournalMSS;
      let adaptateurPersistance;

      beforeEach(() => {
        let compteurId = 0;
        const adaptateurUUID = {
          genereUUID: () => {
            compteurId += 1;
            return `${compteurId}`;
          },
        };
        adaptateurHorloge.maintenant = () => new Date(2000, 1, 1, 12, 0);
        adaptateurJournalMSS = AdaptateurJournalMSSMemoire.nouvelAdaptateur();
        adaptateurPersistance = AdaptateurPersistanceMemoire.nouvelAdaptateur(
          { utilisateurs: [] },
          adaptateurHorloge
        );
        depot = DepotDonneesUtilisateurs.creeDepot({
          adaptateurChiffrement,
          adaptateurJournalMSS,
          adaptateurJWT,
          adaptateurPersistance,
          adaptateurUUID,
        });
      });

      it("lève une exception et n'enregistre pas l'utilisateur si l'email n'est pas renseigné", async () => {
        let utilisateurCree = false;
        let erreurLevee;
        adaptateurPersistance.ajouteUtilisateur = async () => {
          utilisateurCree = true;
        };

        try {
          await depot.nouvelUtilisateur({ prenom: 'Jean', nom: 'Dupont' });
          erreurLevee = false;
        } catch (erreur) {
          erreurLevee = true;
          expect(erreur).to.be.a(ErreurEmailManquant);
          expect(utilisateurCree).to.be(false);
        } finally {
          if (!erreurLevee)
            expect().to.fail(
              "La création de l'utilisateur aurait dû lever une ErreurEmailManquant"
            );
        }
      });

      it('génère un UUID pour cet utilisateur', async () => {
        const utilisateur = await depot.nouvelUtilisateur({
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
        });

        expect(utilisateur.id).to.equal('1');
      });

      it('ajoute le nouvel utilisateur au dépôt', async () => {
        const u = await depot.utilisateur('1');
        expect(u).to.be(undefined);

        await depot.nouvelUtilisateur({
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
        });

        const utilisateur = await depot.utilisateur('1');
        expect(utilisateur).to.be.an(Utilisateur);
        expect(utilisateur.idResetMotDePasse).to.equal('2');
        expect(utilisateur.prenom).to.equal('Jean');
        expect(utilisateur.nom).to.equal('Dupont');
        expect(utilisateur.email).to.equal('jean.dupont@mail.fr');
        expect(utilisateur.adaptateurJWT).to.equal(adaptateurJWT);
      });

      it('utilise la date actuelle comme date de création du nouvel utilisateur', async () => {
        const utilisateur = await depot.nouvelUtilisateur({
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
        });

        expect(utilisateur).to.be.an(Utilisateur);
        expect(utilisateur.email).to.equal('jean.dupont@mail.fr');
        expect(utilisateur.dateCreation).to.eql(adaptateurHorloge.maintenant());
      });

      it("consigne des événements traçants l'inscription de l'utilisateur", async () => {
        const evenementConsignes = [];
        adaptateurJournalMSS.consigneEvenement = async (evenement) => {
          evenementConsignes.push(evenement);
        };

        await depot.nouvelUtilisateur({
          prenom: 'Jean',
          nom: 'Dupont',
          email: 'jean.dupont@mail.fr',
        });

        expect(evenementConsignes.map((e) => e.type)).to.eql([
          'NOUVEL_UTILISATEUR_INSCRIT',
          'PROFIL_UTILISATEUR_MODIFIE',
        ]);
      });
    });

    describe("quand l'utilisateur existe déjà", () => {
      it('lève une `ErreurUtilisateurExistant`', (done) => {
        const adaptateurPersistance =
          AdaptateurPersistanceMemoire.nouvelAdaptateur({
            utilisateurs: [{ id: '123', email: 'jean.dupont@mail.fr' }],
          });
        depot = DepotDonneesUtilisateurs.creeDepot({
          adaptateurChiffrement,
          adaptateurPersistance,
        });

        depot
          .nouvelUtilisateur({ email: 'jean.dupont@mail.fr' })
          .then(() => done('Une exception aurait dû être levée.'))
          .catch((e) => {
            expect(e).to.be.a(ErreurUtilisateurExistant);
            expect(e.idUtilisateur).to.equal('123');
          })
          .then(() => done())
          .catch(done);
      });
    });

    it('supprime un identifiant de reset de mot de passe', (done) => {
      const adaptateurPersistance =
        AdaptateurPersistanceMemoire.nouvelAdaptateur({
          utilisateurs: [
            {
              id: '123',
              email: 'jean.dupont@mail.fr',
              idResetMotDePasse: '999',
            },
          ],
        });
      depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurChiffrement,
        adaptateurPersistance,
      });

      depot
        .utilisateur('123')
        .then((utilisateur) => {
          expect(utilisateur.idResetMotDePasse).to.equal('999');
          depot.supprimeIdResetMotDePassePourUtilisateur(utilisateur);
        })
        .then(() => depot.utilisateur('123'))
        .then((utilisateur) =>
          expect(utilisateur.idResetMotDePasse).to.be(undefined)
        )
        .then(() => done())
        .catch(done);
    });
  });

  describe('Sur demande réinitialisation du mot de passe', () => {
    it("ajoute un identifiant de reset de mot de passe à l'utilisateur", async () => {
      const depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurChiffrement,
        adaptateurUUID: {
          genereUUID: () => '11111111-1111-1111-1111-111111111111',
        },
        adaptateurPersistance: unePersistanceMemoire()
          .ajouteUnUtilisateur({ id: '123', email: 'jean.dupont@mail.fr' })
          .construis(),
      });

      const avant = await depot.utilisateur('123');
      expect(avant.idResetMotDePasse).to.be(undefined);

      const apres = await depot.reinitialiseMotDePasse('jean.dupont@mail.fr');
      expect(apres.idResetMotDePasse).to.equal(
        '11111111-1111-1111-1111-111111111111'
      );
    });

    it("échoue silencieusement si l'utilisateur est inconnu", async () => {
      const depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurChiffrement,
        adaptateurPersistance: unePersistanceMemoire().construis(),
      });

      const u = await depot.reinitialiseMotDePasse('jean.dupont@mail.fr');

      expect(u).to.be(undefined);
    });
  });

  describe("sur demande de suppression d'un utilisateur", () => {
    it("lève une exception si l'utilisateur a créé des services", (done) => {
      const adaptateurPersistance =
        AdaptateurPersistanceMemoire.nouvelAdaptateur({
          utilisateurs: [{ id: '999', email: 'jean.dupont@mail.fr' }],
          homologations: [
            { id: '123', descriptionService: { nomService: 'Un service' } },
          ],
          autorisations: [
            { idUtilisateur: '999', idHomologation: '123', type: 'createur' },
          ],
        });
      const depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurPersistance,
      });

      depot
        .supprimeUtilisateur('999')
        .then(() =>
          done('La tentative de suppression aurait dû lever une exception')
        )
        .catch((erreur) => {
          expect(erreur).to.be.an(ErreurSuppressionImpossible);
          expect(erreur.message).to.equal(
            'Suppression impossible : l\'utilisateur "999" a créé des services'
          );
          done();
        })
        .catch(done);
    });

    it("lève une exception si l'utilisateur n'existe pas", (done) => {
      const adaptateurPersistance =
        AdaptateurPersistanceMemoire.nouvelAdaptateur();
      const depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurPersistance,
      });

      depot
        .supprimeUtilisateur('999')
        .then(() =>
          done('La tentative de suppression aurait dû lever une exception')
        )
        .catch((erreur) => {
          expect(erreur).to.be.an(ErreurUtilisateurInexistant);
          expect(erreur.message).to.equal('L\'utilisateur "999" n\'existe pas');
          done();
        })
        .catch(done);
    });

    it('supprime les autorisations de contribution pour cet utilisateur (mais pas les autres)', (done) => {
      const adaptateurPersistance =
        AdaptateurPersistanceMemoire.nouvelAdaptateur({
          utilisateurs: [
            { id: '999', email: 'jean.dupont@mail.fr' },
            { id: '000', email: 'un.autre.utilisateur@mail.fr' },
          ],
          homologations: [
            { id: '123', descriptionService: { nomService: 'Un service' } },
          ],
          autorisations: [
            {
              idUtilisateur: '999',
              idHomologation: '123',
              type: 'contributeur',
            },
            {
              idUtilisateur: '000',
              idHomologation: '123',
              type: 'contributeur',
            },
          ],
        });
      const depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurPersistance,
      });
      const depotAutorisations = DepotDonneesAutorisations.creeDepot({
        adaptateurPersistance,
      });

      depot
        .supprimeUtilisateur('999')
        .then(() => depotAutorisations.autorisations('999'))
        .then((autorisations) => expect(autorisations.length).to.equal(0))
        .then(() => depotAutorisations.autorisations('000'))
        .then((autorisations) => expect(autorisations.length).to.equal(1))
        .then(() => done())
        .catch(done);
    });

    it("supprime l'utilisateur", (done) => {
      const adaptateurPersistance =
        AdaptateurPersistanceMemoire.nouvelAdaptateur({
          utilisateurs: [{ id: '999', email: 'jean.dupont@mail.fr' }],
        });
      const depot = DepotDonneesUtilisateurs.creeDepot({
        adaptateurPersistance,
      });

      depot
        .supprimeUtilisateur('999')
        .then(() => depot.utilisateur('999'))
        .then((u) => expect(u).to.be(undefined))
        .then(() => done())
        .catch(done);
    });
  });
});
