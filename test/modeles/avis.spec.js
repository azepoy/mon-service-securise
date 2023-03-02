const expect = require('expect.js');

const { ErreurDureeValiditeInvalide, ErreurAvisInvalide } = require('../../src/erreurs');
const Avis = require('../../src/modeles/avis');
const InformationsHomologation = require('../../src/modeles/informationsHomologation');
const Referentiel = require('../../src/referentiel');

describe("Un avis sur un dossier d'homologation", () => {
  const referentiel = Referentiel.creeReferentiel({
    statutAvisDossierHomologation: { favorable: {} },
    echeancesRenouvellement: { unAn: {} },
  });

  it('est complet si tous les champs requis sont remplis', () => {
    const avis = new Avis({ prenomNom: 'Jean Dupond', statut: 'favorable', dureeValidite: 'unAn' }, referentiel);

    expect(avis.statutSaisie()).to.be(InformationsHomologation.COMPLETES);
  });

  it('est invalide si la durée de validité est inconnue dans le référentiel', () => {
    expect(() => {
      new Avis({ dureeValidite: 'dureeInvalide' }, referentiel);
    }).to.throwError((e) => expect(e).to.be.an(ErreurDureeValiditeInvalide));
  });

  it('est invalide si le statut de validité est inconnu dans le référentiel', () => {
    expect(() => {
      new Avis({ dureeValidite: 'unAn', statut: 'statutInvalide' }, referentiel);
    }).to.throwError((e) => expect(e).to.be.an(ErreurAvisInvalide));
  });
});
