const expect = require('expect.js');
const ConstructeurEvenementCompletudeServiceModifiee = require('./constructeurEvenementCompletudeServiceModifiee');
const EvenementCompletudeServiceModifiee = require('../../../src/modeles/journalMSS/evenementCompletudeServiceModifiee');
const {
  ErreurDetailMesuresManquant,
  ErreurIdentifiantServiceManquant,
  ErreurNombreTotalMesuresManquant,
  ErreurNombreMesuresCompletesManquant,
  ErreurIndiceCyberManquant,
} = require('../../../src/modeles/journalMSS/erreurs');

describe('Un événement de complétude modifiée', () => {
  const unEvenement = () =>
    new ConstructeurEvenementCompletudeServiceModifiee();

  const hacheEnMajuscules = { hacheSha256: (valeur) => valeur?.toUpperCase() };

  it("chiffre l'identifiant du service qui lui est donné", () => {
    const evenement = unEvenement()
      .avecIdService('abc')
      .quiChiffreAvec(hacheEnMajuscules)
      .construis()
      .toJSON();

    expect(evenement.donnees.idService).to.be('ABC');
  });

  it('sait se convertir en JSON', () => {
    const evenement = new EvenementCompletudeServiceModifiee(
      {
        idService: 'abc',
        nombreTotalMesures: 54,
        nombreMesuresCompletes: 38,
        detailMesures: [{ idMesure: 'analyseRisques', statut: 'fait' }],
        indiceCyber: { total: 4.1 },
      },
      { date: '17/11/2022', adaptateurChiffrement: hacheEnMajuscules }
    );

    expect(evenement.toJSON()).to.eql({
      type: 'COMPLETUDE_SERVICE_MODIFIEE',
      donnees: {
        idService: 'ABC',
        nombreTotalMesures: 54,
        nombreMesuresCompletes: 38,
        detailMesures: [{ idMesure: 'analyseRisques', statut: 'fait' }],
        detailIndiceCyber: [{ categorie: 'total', indice: 4.1 }],
      },
      date: '17/11/2022',
    });
  });

  it("range les données de l'indice cyber par catégorie", () => {
    const evenement = unEvenement()
      .avecIndiceCyber({ total: 4.1, gouvernance: 3.8 })
      .construis()
      .toJSON();

    expect(evenement.donnees.detailIndiceCyber).to.eql([
      { categorie: 'total', indice: 4.1 },
      { categorie: 'gouvernance', indice: 3.8 },
    ]);
  });

  it("exige que l'identifiant du service soit renseigné", (done) => {
    try {
      unEvenement().sans('idService').construis();

      done(
        Error("L'instanciation de l'événement aurait dû lever une exception")
      );
    } catch (e) {
      expect(e).to.be.an(ErreurIdentifiantServiceManquant);
      done();
    }
  });

  it('exige que le nombre total de mesures soit renseigné', (done) => {
    try {
      unEvenement().sans('nombreTotalMesures').construis();

      done(
        Error("L'instanciation de l'événement aurait dû lever une exception")
      );
    } catch (e) {
      expect(e).to.be.an(ErreurNombreTotalMesuresManquant);
      done();
    }
  });

  it('exige que le nombre de mesures complètes soit renseigné', (done) => {
    try {
      unEvenement().sans('nombreMesuresCompletes').construis();

      done(
        Error("L'instanciation de l'événement aurait dû lever une exception")
      );
    } catch (e) {
      expect(e).to.be.an(ErreurNombreMesuresCompletesManquant);
      done();
    }
  });

  it('exige que le detail des mesures soit renseigné', (done) => {
    try {
      unEvenement().sans('detailMesures').construis();

      done(
        Error("L'instanciation de l'événement aurait dû lever une exception")
      );
    } catch (e) {
      expect(e).to.be.an(ErreurDetailMesuresManquant);
      done();
    }
  });

  it("exige que l'indice cyber soit renseigné", (done) => {
    try {
      unEvenement().sans('indiceCyber').construis();

      done(
        Error("L'instanciation de l'événement aurait dû lever une exception")
      );
    } catch (e) {
      expect(e).to.be.an(ErreurIndiceCyberManquant);
      done();
    }
  });
});
