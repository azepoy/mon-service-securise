const ElementsConstructibles = require('./elementsConstructibles');
const MesureGenerale = require('./mesureGenerale');
const StatistiquesMesures = require('./statistiquesMesures');

class MesuresGenerales extends ElementsConstructibles {
  constructor(donnees, referentiel) {
    const { mesuresGenerales } = donnees;
    super(MesureGenerale, { items: mesuresGenerales }, referentiel);
  }

  nonSaisies() {
    return this.nombre() === 0;
  }

  parStatutEtCategorie() {
    const rangeMesureParStatut = (acc, mesure) => {
      const mesureReference = this.referentiel.mesure(mesure.id);
      acc[mesure.statut][mesureReference.categorie] ||= [];
      acc[mesure.statut][mesureReference.categorie].push({
        description: mesure.descriptionMesure(),
        indispensable: mesure.estIndispensable(),
        modalites: mesure.modalites,
      });
      return acc;
    };

    const statutFaitALaFin = true;
    const accumulateur =
      MesureGenerale.accumulateurInitialStatuts(statutFaitALaFin);

    return this.toutes()
      .filter((mesure) => mesure.statutRenseigne())
      .sort((m, _) => (m.estIndispensable() ? -1 : 1))
      .reduce(rangeMesureParStatut, accumulateur);
  }

  statistiques(mesuresPersonnalisees, mesuresSpecifiques) {
    const stats = StatistiquesMesures.donneesAZero(
      MesureGenerale.statutsPossibles(),
      this.referentiel.identifiantsCategoriesMesures()
    );

    this.items.forEach((mesure) => {
      const { id, statut } = mesure;
      const { categorie } = this.referentiel.mesure(id);

      if (statut === MesureGenerale.STATUT_FAIT) {
        stats[categorie].misesEnOeuvre += 1;
      }
      if (
        statut === MesureGenerale.STATUT_FAIT ||
        statut === MesureGenerale.STATUT_EN_COURS
      ) {
        stats[categorie].retenues += 1;
      }

      if (mesure.estIndispensable()) {
        stats[categorie].indispensables[statut] += 1;
      } else {
        stats[categorie].recommandees[statut] += 1;
      }
    });

    Object.keys(mesuresPersonnalisees)
      .map(
        (id) =>
          new MesureGenerale(
            {
              id,
              rendueIndispensable: mesuresPersonnalisees[id].indispensable,
            },
            this.referentiel
          )
      )
      .reduce((acc, mesure) => {
        const { categorie } = this.referentiel.mesure(mesure.id);
        if (mesure.estIndispensable()) acc[categorie].indispensables.total += 1;
        if (mesure.estRecommandee()) acc[categorie].recommandees.total += 1;
        return acc;
      }, stats);

    return new StatistiquesMesures(stats, this.referentiel, mesuresSpecifiques);
  }

  statutSaisie() {
    if (this.nonSaisies()) return MesuresGenerales.A_SAISIR;
    if (
      this.items.every(
        (item) => item.statutSaisie() === MesuresGenerales.COMPLETES
      )
    ) {
      return MesuresGenerales.COMPLETES;
    }
    return MesuresGenerales.A_COMPLETER;
  }
}

module.exports = MesuresGenerales;
