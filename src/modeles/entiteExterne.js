const InformationsHomologation = require('./informationsHomologation');

class EntiteExterne extends InformationsHomologation {
  constructor(donneesEntite) {
    super(['nom', 'contact', 'acces']);
    this.renseigneProprietes(donneesEntite);
  }

  statutSaisie() {
    return this.nom && this.contact
      ? InformationsHomologation.COMPLETES
      : InformationsHomologation.A_COMPLETER;
  }
}

module.exports = EntiteExterne;
